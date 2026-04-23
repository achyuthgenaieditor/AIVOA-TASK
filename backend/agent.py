import os
import re
import uuid
import json
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from models import Interaction
from schemas import ChatResponse, FormData, Message, ToolExecution, ToolName

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - optional until dependencies are installed
    ChatGroq = None


class AgentState(TypedDict, total=False):
    text: str
    current_form_data: dict[str, Any]
    tool_name: ToolName
    form_data: dict[str, Any]
    changed_fields: list[str]
    response: str
    result: str


def _camel_to_model(form_data: FormData) -> dict[str, Any]:
    return {
        "hcp_name": form_data.hcpName,
        "product_discussed": form_data.productDiscussed,
        "date_of_visit": form_data.dateOfVisit,
        "sentiment": form_data.sentiment,
        "samples_dropped": form_data.samplesDropped,
        "materials_shared": ", ".join(form_data.materialsShared),
        "follow_up_required": form_data.followUpRequired,
        "notes": form_data.notes,
    }


def _model_to_form(interaction: Interaction) -> FormData:
    materials = [item.strip() for item in (interaction.materials_shared or "").split(",") if item.strip()]
    return FormData(
        hcpName=interaction.hcp_name or "",
        productDiscussed=interaction.product_discussed or "",
        dateOfVisit=interaction.date_of_visit or "",
        sentiment=interaction.sentiment or "",
        samplesDropped=interaction.samples_dropped,
        materialsShared=materials,
        followUpRequired=interaction.follow_up_required,
        notes=interaction.notes or "",
    )


def _classify_tool(text: str) -> ToolName:
    lower = text.lower()
    if re.search(r"\b(generate|create|write)\b.*\b(notes?|summary|report)\b", lower):
        return "generate_notes"
    if re.search(r"\b(show|get|list|view|recent|past|history)\b", lower) and re.search(r"\b(history|interactions?|visits?|calls?)\b", lower):
        return "get_history"
    if re.search(r"\b(met|visited|saw|called|spoke with|spoke to|meeting with|call with|visit with)\b", lower):
        return "log_interaction"
    if re.search(r"\b(schedule|set|book|plan|arrange)\b", lower) and re.search(r"\b(follow[\s-]?up|followup|remind|next|callback|call back)\b", lower):
        return "schedule_followup"
    if re.search(r"\b(remind me|callback|call back|follow[\s-]?up|followup)\b", lower) and re.search(r"\b(tomorrow|next week|next \w+|in \d+ days?|to discuss|regarding|about)\b", lower):
        return "schedule_followup"
    if re.search(r"\b(sorry|actually|wrong|change|update|correct|not|edit|fix|modify|replace|instead|should be|make it)\b", lower):
        return "edit_interaction"
    return "log_interaction"


def _title_name(name: str, keep_doctor_prefix: bool = True) -> str:
    cleaned = re.sub(r"[^A-Za-z .'-]", "", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"^(dr\.?\s*)", "", cleaned, flags=re.IGNORECASE).strip()
    titled = " ".join(part.capitalize() for part in cleaned.split())
    if keep_doctor_prefix and titled:
        return f"Dr. {titled}"
    return titled


MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


def _clean_phrase(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip(" .,-")
    stop_parts = re.split(
        r"\b(?:and|but|then|also|sentiment|response|feedback|shared|gave|provided|samples?|brochures?|follow[- ]?up|next|asked|doctor|dr\.?|hcp)\b",
        cleaned,
        maxsplit=1,
        flags=re.IGNORECASE,
    )
    return stop_parts[0].strip(" .,-")


def _clean_product(value: str) -> str:
    product = _clean_phrase(value)
    product = re.split(
        r"\b(?:dosage|dose|safety|efficacy|price|pricing|cost|samples?|indication|side effects?|clinical data)\b",
        product,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip(" .,-")
    return product


def _extract_hcp_name(text: str) -> str | None:
    patterns = [
        r"(?:met|visited|saw|called|spoke with|spoke to|meeting with|call with|visit with)\s+(?:doctor|dr\.?)?\s*([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:and|to|for|about|regarding|discussed|talked|covered|shared|gave|provided|asked)\b|[,.]|$)",
        r"(?:doctor|dr\.?)\s+([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:and|to|for|about|regarding|discussed|talked|covered|shared|gave|provided|asked)\b|[,.]|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            name = _clean_phrase(match.group(1))
            if name:
                return _title_name(name, keep_doctor_prefix=True)
    return None


def _extract_product(text: str) -> str | None:
    patterns = [
        r"(?:discussed|talked about|covered|presented|explained|introduced|promoted|demoed)\s+(?:the\s+)?(?:product\s+|brand\s+|medicine\s+|therapy\s+)?([A-Za-z0-9][A-Za-z0-9 +/.-]*?)(?=\s+(?:with|and|but|sentiment|response|feedback|doctor|dr\.?|hcp|shared|gave|provided|samples?|brochures?|clinical|follow|next|asked|was|is)\b|[,.]|$)",
        r"(?:product|brand|medicine|therapy)\s+(?:was|is|as|to)?\s*([A-Za-z0-9][A-Za-z0-9 +/.-]*?)(?=\s+(?:with|and|but|sentiment|response|feedback|shared|gave|provided|follow|next)\b|[,.]|$)",
        r"(?:regarding|about)\s+(?:the\s+)?([A-Za-z0-9][A-Za-z0-9 +/.-]*?)(?=\s+(?:with|and|but|sentiment|response|feedback|shared|gave|provided|follow|next)\b|[,.]|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            product = _clean_product(match.group(1))
            if product and product.lower() not in {"samples", "brochures", "pricing", "cost"}:
                return product[0].upper() + product[1:]
    return None


def _extract_sentiment(text: str) -> str | None:
    lower = text.lower()
    if re.search(r"\b(not interested|rejected|concerned|concerns|worried|negative|poor response|bad response|hesitant|objection|unhappy)\b", lower):
        return "Negative"
    if re.search(r"\b(neutral|okay|average|mixed|no strong opinion|no clear interest)\b", lower):
        return "Neutral"
    if re.search(r"\b(positive|interested|liked|receptive|good response|happy|agreed|strong interest|promising|favourable|favorable)\b", lower):
        return "Positive"
    return None


def _extract_materials(text: str) -> list[str]:
    lower = text.lower()
    materials: list[str] = []
    if re.search(r"\bbrochures?|leaflets?|pamphlets?\b", lower):
        materials.append("Brochures")
    if re.search(r"\bclinical (?:study|studies|data|paper)|\bstudies\b|\btrial data\b", lower):
        materials.append("Clinical Studies")
    if re.search(r"\bpricing|price|cost|discount\b", lower):
        materials.append("Pricing")
    if re.search(r"\bsample info|sample information|sample details\b", lower):
        materials.append("Samples Info")
    return list(dict.fromkeys(materials))


def _extract_samples(text: str) -> bool | None:
    lower = text.lower()
    if re.search(r"\b(no|without|did not|didn't|not)\b.{0,30}\bsamples?\b|\bsamples?\b.{0,20}\b(no|not given|not provided)\b", lower):
        return False
    if re.search(r"\bsamples?\b.{0,35}\b(dropped|gave|given|provided|left|handed|shared|yes)\b|\b(dropped|gave|provided|left|handed)\b.{0,20}\bsamples?\b", lower):
        return True
    return None


def _extract_follow_up(text: str) -> bool | None:
    lower = text.lower()
    if re.search(r"\b(no|cancel|remove)\s+follow[- ]?up\b|\bfollow[- ]?up\b.{0,25}\b(not required|not needed|not necessary|no|cancelled|canceled)\b", lower):
        return False
    if re.search(r"\bfollow[- ]?up|followup|next visit|next week|reminder|remind|callback|call back|schedule again\b", lower):
        return True
    return None


def _extract_follow_up_date(text: str, current: dict[str, Any]) -> str | None:
    lower = text.lower()
    base = _base_visit_date(current)

    if re.search(r"\btomorrow\b", lower):
        return (datetime.now().date() + timedelta(days=1)).isoformat()
    if re.search(r"\b(next week|after a week)\b", lower):
        return (base.date() + timedelta(days=7)).isoformat()

    in_days = re.search(r"\bin\s+(\d{1,2})\s+days?\b", lower)
    if in_days:
        return (base.date() + timedelta(days=int(in_days.group(1)))).isoformat()

    weekday_match = re.search(r"\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", lower)
    if weekday_match:
        target = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].index(weekday_match.group(1))
        days_ahead = (target - base.weekday() + 7) % 7 or 7
        return (base.date() + timedelta(days=days_ahead)).isoformat()

    return _extract_date_correction(text, current)


def _extract_follow_up_focus(text: str, current: dict[str, Any]) -> str:
    patterns = [
        r"(?:follow[- ]?up|followup|remind|callback|call back|schedule)\s+(?:with\s+[A-Za-z .'-]+)?(?:\s+next\s+\w+|\s+tomorrow|\s+in\s+\d+\s+days?)?\s*(?:to|for|about|regarding)\s+(.+?)(?=\.|,|$)",
        r"(?:discuss|review)\s+(.+?)(?=\.|,|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            focus = _clean_phrase(match.group(1))
            if focus:
                return focus[0].upper() + focus[1:]
    return current.get("productDiscussed") or "open discussion points"


def _base_visit_date(current: dict[str, Any]) -> datetime:
    raw_date = str(current.get("dateOfVisit") or "").strip()
    for date_format in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw_date, date_format)
        except ValueError:
            continue
    return datetime.now()


def _date_from_day(day: int, current: dict[str, Any]) -> str | None:
    base = _base_visit_date(current)
    try:
        return base.replace(day=day).date().isoformat()
    except ValueError:
        return None


def _extract_date_correction(text: str, current: dict[str, Any]) -> str | None:
    lower = text.lower()
    base = _base_visit_date(current)

    if re.search(r"\b(tomorrow|next day|next date)\b", lower):
        return (base.date() + timedelta(days=1)).isoformat()
    if re.search(r"\b(today|same day)\b", lower):
        return datetime.now().date().isoformat()
    if re.search(r"\b(yesterday|previous day|last day)\b", lower):
        return (base.date() - timedelta(days=1)).isoformat()

    explicit = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", lower)
    if explicit:
        day = int(explicit.group(1))
        month = int(explicit.group(2))
        year = int(explicit.group(3) or base.year)
        if year < 100:
            year += 2000
        try:
            return datetime(year, month, day).date().isoformat()
        except ValueError:
            return None

    iso_date = re.search(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b", lower)
    if iso_date:
        try:
            return datetime(int(iso_date.group(1)), int(iso_date.group(2)), int(iso_date.group(3))).date().isoformat()
        except ValueError:
            return None

    month_day = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(" + "|".join(MONTHS.keys()) + r")(?:\s+(20\d{2}))?\b", lower)
    if not month_day:
        month_day = re.search(r"\b(" + "|".join(MONTHS.keys()) + r")\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b", lower)
        if month_day:
            month = MONTHS[month_day.group(1)]
            day = int(month_day.group(2))
            year = int(month_day.group(3) or base.year)
            try:
                return datetime(year, month, day).date().isoformat()
            except ValueError:
                return None
    elif month_day:
        day = int(month_day.group(1))
        month = MONTHS[month_day.group(2)]
        year = int(month_day.group(3) or base.year)
        try:
            return datetime(year, month, day).date().isoformat()
        except ValueError:
            return None

    day_only = re.search(r"\b(?:change|update|correct|set|make)\s+(?:the\s+)?(?:visit\s+)?date\s+(?:to|as)?\s*(\d{1,2})\b", lower)
    if not day_only:
        day_only = re.search(r"\b(?:date|visit date)\s+(?:is|should be|to|as)\s+(\d{1,2})\b", lower)
    if day_only:
        return _date_from_day(int(day_only.group(1)), current)

    return None


def _extract_visit_date(text: str) -> str | None:
    parsed = _extract_date_correction(text, {})
    if parsed:
        return parsed
    lower = text.lower()
    if "today" in lower:
        return datetime.now().date().isoformat()
    if "yesterday" in lower:
        return (datetime.now().date() - timedelta(days=1)).isoformat()
    return None


def _extract_discussion_points(text: str) -> list[str]:
    points: list[str] = []
    patterns = [
        r"(?:discussed|talked about|covered|explained|presented)\s+(.+?)(?=\.|,?\s+(?:sentiment|response|feedback|shared|gave|provided|follow[- ]?up|samples?|doctor|dr\.?)\b|$)",
        r"(?:asked about|questions? about|concerned about)\s+(.+?)(?=\.|,|$)",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            point = _clean_phrase(match.group(1))
            if point and point.lower() not in {"samples", "brochures"}:
                for item in re.split(r",|\band\b", point, flags=re.IGNORECASE):
                    clean_item = item.strip(" .,-")
                    if clean_item and clean_item.lower() not in {"samples", "brochures"}:
                        points.append(clean_item[0].upper() + clean_item[1:])
    return list(dict.fromkeys(points))


def _extract_important_notes(text: str) -> list[str]:
    notes: list[str] = []
    patterns = [
        ("Doctor question", r"(?:asked about|questioned|wanted to know about|enquired about|inquired about)\s+(.+?)(?=\.|,?\s+(?:i |we |shared|gave|provided|follow|samples?|sentiment)\b|$)"),
        ("Concern", r"(?:concerned about|concerns? about|worried about|objection(?:s)? (?:on|about)|hesitant about)\s+(.+?)(?=\.|,|$)"),
        ("Request", r"(?:requested|asked for|wanted|needs?|asked to send)\s+(.+?)(?=\.|,|$)"),
        ("Commitment", r"(?:agreed to|committed to|will review|will consider|ready to)\s+(.+?)(?=\.|,|$)"),
    ]
    for label, pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            value = _clean_phrase(match.group(1))
            if value:
                notes.append(f"{label}: {value[0].upper() + value[1:]}")
    return list(dict.fromkeys(notes))


def _build_interaction_notes(text: str, form_data: dict[str, Any]) -> str:
    points = _extract_discussion_points(text)
    important_notes = _extract_important_notes(text)
    product = form_data.get("productDiscussed") or (points[0] if points else "Not specified")
    sentiment = form_data.get("sentiment") or "Not specified"
    materials = form_data.get("materialsShared") or []
    samples = "Samples dropped" if form_data.get("samplesDropped") else "No samples recorded"
    follow_up = "Follow-up required" if form_data.get("followUpRequired") else "No follow-up marked yet"

    discussion = "; ".join(points) if points else "No specific discussion points captured."
    key_notes = "; ".join(important_notes) if important_notes else "No additional important notes mentioned."
    feedback_map = {
        "Positive": "HCP showed positive interest/receptive response.",
        "Neutral": "HCP response was neutral or exploratory.",
        "Negative": "HCP had concerns or low interest; objection handling may be needed.",
    }

    return (
        "Discussion Notes\n"
        f"- HCP: {form_data.get('hcpName') or 'Not specified'}\n"
        f"- Product/Topic: {product}\n"
        f"- Discussion Summary: {discussion}\n"
        f"- Important Notes: {key_notes}\n"
        f"- HCP Feedback: {feedback_map.get(sentiment, 'Feedback not clearly specified.')}\n"
        f"- Materials/Samples: {', '.join(materials) if materials else 'No materials recorded'}; {samples}\n"
        f"- Next Step: {follow_up}."
    )


def _append_action_note(notes: str, action: str) -> str:
    clean_notes = (notes or "").strip()
    if not clean_notes:
        return f"Discussion Notes\n- Important Notes: {action}"
    if action in clean_notes:
        return clean_notes
    return f"{clean_notes}\n- Action Item: {action}"


def _history_summary(interactions: list[Interaction]) -> str:
    if not interactions:
        return "No saved interactions were found yet. Log a visit first, then ask for history again."

    lines = [
        f"{idx}. {item.date_of_visit or 'No date'} - {item.hcp_name or 'Unknown HCP'} - {item.product_discussed or 'No product'} - {item.sentiment or 'No sentiment'}"
        for idx, item in enumerate(interactions, start=1)
    ]

    sentiments = Counter(item.sentiment for item in interactions if item.sentiment)
    products = Counter(item.product_discussed for item in interactions if item.product_discussed)
    open_followups = sum(1 for item in interactions if item.follow_up_required)
    latest = interactions[0]

    sentiment_text = ", ".join(f"{name}: {count}" for name, count in sentiments.items()) or "No sentiment captured"
    top_product = products.most_common(1)[0][0] if products else "No product trend yet"
    next_action = "Prioritize follow-up because there are open follow-up flags." if open_followups else "No urgent follow-up flags; continue routine engagement."
    if latest.sentiment == "Negative":
        next_action = "Latest interaction was negative; schedule objection-handling follow-up."

    return (
        "Recent Interaction History\n\n"
        + "\n".join(lines)
        + "\n\nCRM Insights\n"
        f"- Total recent interactions: {len(interactions)}\n"
        f"- Sentiment mix: {sentiment_text}\n"
        f"- Most discussed product: {top_product}\n"
        f"- Open follow-ups: {open_followups}\n"
        f"- Suggested next action: {next_action}"
    )


def _extract_corrections(text: str, current: dict[str, Any]) -> dict[str, Any]:
    lower = text.lower()
    result: dict[str, Any] = {}

    name_patterns = [
        r"(?:replace|change|correct|update)\s+(?:the\s+)?(?:hcp\s+)?name\s+(?:of\s+|from\s+)?[A-Za-z .'-]*\s+(?:to|as)\s+([A-Za-z .'-]+)",
        r"(?:name|hcp)\s+(?:is|should be|to|as)\s+([A-Za-z .'-]+)",
        r"(?:not\s+[A-Za-z .'-]+,\s*(?:it is|it's|make it)\s+)([A-Za-z .'-]+)",
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            result["hcpName"] = _title_name(match.group(1), keep_doctor_prefix=True)
            break

    product_patterns = [
        r"(?:replace|change|correct|update)\s+(?:the\s+)?product\s+(?:from\s+)?[A-Za-z0-9 -]*\s+(?:to|as)\s+([A-Za-z0-9 -]+)",
        r"(?:product|medicine|brand)\s+(?:is|should be|to|as)\s+([A-Za-z0-9 -]+)",
    ]
    for pattern in product_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            product = _clean_product(match.group(1))
            if product:
                result["productDiscussed"] = product[0].upper() + product[1:]
            break

    sentiment = _extract_sentiment(text)
    if sentiment:
        result["sentiment"] = sentiment

    samples = _extract_samples(text)
    if samples is not None:
        result["samplesDropped"] = samples

    follow_up = _extract_follow_up(text)
    if follow_up is not None:
        result["followUpRequired"] = follow_up

    materials = _extract_materials(text)
    if materials:
        existing = [] if re.search(r"\breplace\b.*\bmaterials?\b", lower) else current.get("materialsShared", [])
        result["materialsShared"] = list(dict.fromkeys([*existing, *materials]))

    corrected_date = _extract_date_correction(text, current)
    if corrected_date:
        result["dateOfVisit"] = corrected_date
    elif "today" in lower:
        result["dateOfVisit"] = datetime.now().date().isoformat()
    elif "yesterday" in lower:
        result["dateOfVisit"] = (datetime.now().date() - timedelta(days=1)).isoformat()

    return result


def _extract_entities(text: str) -> dict[str, Any]:
    result: dict[str, Any] = {}

    hcp_name = _extract_hcp_name(text)
    if hcp_name:
        result["hcpName"] = hcp_name

    product = _extract_product(text)
    if product:
        result["productDiscussed"] = product

    visit_date = _extract_visit_date(text)
    if visit_date:
        result["dateOfVisit"] = visit_date

    sentiment = _extract_sentiment(text)
    if sentiment:
        result["sentiment"] = sentiment

    samples = _extract_samples(text)
    if samples is not None:
        result["samplesDropped"] = samples

    materials = _extract_materials(text)
    if materials:
        result["materialsShared"] = materials

    follow_up = _extract_follow_up(text)
    if follow_up is not None:
        result["followUpRequired"] = follow_up

    return result


def _normalize_llm_updates(data: dict[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    allowed = {
        "hcpName",
        "productDiscussed",
        "dateOfVisit",
        "sentiment",
        "samplesDropped",
        "materialsShared",
        "followUpRequired",
        "notes",
    }

    for key, value in data.items():
        if key not in allowed or value in (None, "", []):
            continue

        if key == "hcpName" and isinstance(value, str):
            updates[key] = _title_name(value, keep_doctor_prefix=True)
        elif key == "productDiscussed" and isinstance(value, str):
            product = _clean_product(value)
            if product:
                updates[key] = product[0].upper() + product[1:]
        elif key == "sentiment" and isinstance(value, str):
            normalized = value.strip().capitalize()
            if normalized in {"Positive", "Neutral", "Negative"}:
                updates[key] = normalized
        elif key in {"samplesDropped", "followUpRequired"}:
            if isinstance(value, bool):
                updates[key] = value
            elif isinstance(value, str) and value.lower() in {"true", "yes"}:
                updates[key] = True
            elif isinstance(value, str) and value.lower() in {"false", "no"}:
                updates[key] = False
        elif key == "materialsShared":
            if isinstance(value, list):
                updates[key] = [str(item).strip() for item in value if str(item).strip()]
            elif isinstance(value, str):
                updates[key] = [item.strip() for item in value.split(",") if item.strip()]
        elif key in {"dateOfVisit", "notes"} and isinstance(value, str):
            updates[key] = value.strip()

    return updates


def _llm_extract_fields(text: str, current: dict[str, Any], mode: str) -> dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or ChatGroq is None:
        return {}

    instruction = (
        "Extract all interaction fields present or strongly implied by the message."
        if mode == "log"
        else "Extract only the fields the user wants to correct or update."
    )
    llm = ChatGroq(api_key=api_key, model=os.getenv("GROQ_MODEL", "gemma2-9b-it"), temperature=0)
    prompt = (
        "You are a life-sciences CRM extraction engine for an HCP interaction screen.\n"
        f"{instruction}\n"
        "Return ONLY valid JSON. No markdown. No explanation.\n"
        "Allowed keys: hcpName, productDiscussed, dateOfVisit, sentiment, samplesDropped, "
        "materialsShared, followUpRequired, notes.\n"
        "Rules:\n"
        "- dateOfVisit must be ISO YYYY-MM-DD when possible.\n"
        "- sentiment must be Positive, Neutral, Negative, or empty.\n"
        "- materialsShared must be an array.\n"
        "- samplesDropped and followUpRequired must be booleans.\n"
        "- For log mode, notes can be omitted because the app generates CRM discussion notes separately.\n"
        "- For edit mode, return only changed fields.\n\n"
        f"Today: {datetime.now().date().isoformat()}\n"
        f"Current form JSON: {json.dumps(current)}\n"
        f"User message: {text}"
    )

    try:
        content = str(llm.invoke(prompt).content).strip()
        content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.IGNORECASE).strip()
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            return {}
        return _normalize_llm_updates(parsed)
    except Exception:
        return {}


def _extract_entities_with_llm(text: str, current: dict[str, Any], mode: str) -> dict[str, Any]:
    fallback = _extract_entities(text)
    llm_updates = _llm_extract_fields(text, current, mode)
    if mode == "edit":
        return {**fallback, **llm_updates}
    return {**fallback, **{key: value for key, value in llm_updates.items() if key != "notes"}}


def _merge_form(current: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    merged = {**current}
    for key, value in updates.items():
        if value is not None and value != "":
            merged[key] = value
    return merged


def _changed_labels(updates: dict[str, Any]) -> str:
    labels = {
        "hcpName": "HCP name",
        "productDiscussed": "product",
        "dateOfVisit": "visit date",
        "sentiment": "sentiment",
        "samplesDropped": "samples dropped",
        "materialsShared": "materials shared",
        "followUpRequired": "follow-up required",
        "notes": "notes",
    }
    return ", ".join(labels.get(key, key) for key in updates)


def _llm_notes(form_data: dict[str, Any], text: str) -> str | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or ChatGroq is None:
        return None

    llm = ChatGroq(api_key=api_key, model=os.getenv("GROQ_MODEL", "gemma2-9b-it"), temperature=0.2)
    prompt = (
        "Create concise CRM call notes for a life-sciences sales representative. "
        "Include objective, key discussion points, materials, sentiment, and next steps.\n\n"
        f"User text: {text}\nExtracted form: {form_data}"
    )
    try:
        return str(llm.invoke(prompt).content)
    except Exception:
        return None


def build_graph(db: Session):
    graph = StateGraph(AgentState)

    def route(state: AgentState) -> AgentState:
        return {**state, "tool_name": _classify_tool(state["text"])}

    def log_interaction(state: AgentState) -> AgentState:
        updates = _extract_entities_with_llm(state["text"], state["current_form_data"], "log")
        updates.setdefault("dateOfVisit", datetime.now().date().isoformat())
        preliminary_form = _merge_form(state["current_form_data"], updates)
        updates["notes"] = _build_interaction_notes(state["text"], preliminary_form)
        form_data = _merge_form(state["current_form_data"], updates)
        interaction = Interaction(**_camel_to_model(FormData(**form_data)))
        db.add(interaction)
        db.commit()
        name = form_data.get("hcpName") or "the HCP"
        product = form_data.get("productDiscussed") or "the discussed product"
        return {
            **state,
            "form_data": form_data,
            "changed_fields": list(updates.keys()),
            "result": f"Saved interaction for {name}.",
            "response": f"I logged the interaction with {name}, captured {product}, and prepared structured discussion notes from your conversation.",
        }

    def edit_interaction(state: AgentState) -> AgentState:
        updates = _extract_corrections(state["text"], state["current_form_data"])
        if not updates:
            updates = _extract_entities_with_llm(state["text"], state["current_form_data"], "edit")
        form_data = _merge_form(state["current_form_data"], updates)
        if not updates:
            response = "I understood that you want to correct the draft. Please mention the field and new value, for example: 'replace the name Smith to Achyuth' or 'change sentiment to neutral'."
        else:
            response = f"I updated {_changed_labels(updates)} in the form. The remaining interaction details are unchanged."
        return {
            **state,
            "form_data": form_data,
            "changed_fields": list(updates.keys()),
            "result": "Updated " + (_changed_labels(updates) if updates else "no fields"),
            "response": response,
        }

    def get_history(state: AgentState) -> AgentState:
        hcp_name = _extract_entities(state["text"]).get("hcpName")
        query = db.query(Interaction).order_by(Interaction.created_at.desc()).limit(5)
        if hcp_name:
            query = db.query(Interaction).filter(Interaction.hcp_name.ilike(f"%{hcp_name}%")).order_by(Interaction.created_at.desc()).limit(5)
        interactions = query.all()
        response = _history_summary(interactions)
        return {**state, "form_data": {}, "changed_fields": [], "result": f"Retrieved {len(interactions)} recent interactions with CRM insights.", "response": response}

    def schedule_followup(state: AgentState) -> AgentState:
        updates: dict[str, Any] = {}
        hcp_name = _extract_hcp_name(state["text"])
        if hcp_name:
            updates["hcpName"] = hcp_name
        updates["followUpRequired"] = True
        follow_up_date = _extract_follow_up_date(state["text"], state["current_form_data"])
        focus = _extract_follow_up_focus(state["text"], state["current_form_data"])
        action = f"Follow-up planned{f' for {follow_up_date}' if follow_up_date else ''}: {focus}."
        current_notes = state["current_form_data"].get("notes", "")
        updates["notes"] = _append_action_note(current_notes, action)
        form_data = _merge_form(state["current_form_data"], updates)
        date_text = f" on {follow_up_date}" if follow_up_date else ""
        return {
            **state,
            "form_data": form_data,
            "changed_fields": list(updates.keys()),
            "result": f"Marked follow-up required{date_text}.",
            "response": f"I marked follow-up as required for {form_data.get('hcpName') or 'this HCP'}{date_text}. Focus: {focus}. I also added this as an action item in the notes.",
        }

    def generate_notes(state: AgentState) -> AgentState:
        notes = _llm_notes(state["current_form_data"], state["text"])
        if notes is None:
            notes = _build_interaction_notes(state["text"], state["current_form_data"])
        form_data = _merge_form(state["current_form_data"], {"notes": notes})
        return {**state, "form_data": form_data, "changed_fields": ["notes"], "result": "Generated CRM notes.", "response": notes}

    graph.add_node("route", route)
    graph.add_node("log_interaction", log_interaction)
    graph.add_node("edit_interaction", edit_interaction)
    graph.add_node("get_history", get_history)
    graph.add_node("schedule_followup", schedule_followup)
    graph.add_node("generate_notes", generate_notes)
    graph.set_entry_point("route")
    graph.add_conditional_edges("route", lambda state: state["tool_name"], {
        "log_interaction": "log_interaction",
        "edit_interaction": "edit_interaction",
        "get_history": "get_history",
        "schedule_followup": "schedule_followup",
        "generate_notes": "generate_notes",
    })
    for node in ["log_interaction", "edit_interaction", "get_history", "schedule_followup", "generate_notes"]:
        graph.add_edge(node, END)
    return graph.compile()


def run_agent(text: str, current_form_data: FormData, db: Session) -> ChatResponse:
    app = build_graph(db)
    final_state = app.invoke({"text": text, "current_form_data": current_form_data.model_dump()})
    tool_name = final_state["tool_name"]
    timestamp = datetime.now()
    return ChatResponse(
        message=Message(id=f"msg-{uuid.uuid4()}", role="assistant", content=final_state["response"], timestamp=timestamp),
        formData=final_state.get("form_data", {}),
        changedFields=final_state.get("changed_fields", []),
        toolExecution=ToolExecution(
            id=f"exec-{uuid.uuid4()}",
            toolName=tool_name,
            parameters={"query": text},
            status="completed",
            timestamp=timestamp,
            result=final_state.get("result", "Tool completed."),
        ),
    )
