import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FormData, FormStatus } from '@/types';
import { saveInteraction as saveInteractionApi } from '@/lib/api';

const emptyForm: FormData = {
  hcpName: '',
  productDiscussed: '',
  dateOfVisit: '',
  sentiment: '',
  samplesDropped: false,
  materialsShared: [],
  followUpRequired: false,
  notes: '',
};

interface InteractionState {
  formData: FormData;
  formStatus: FormStatus;
  isSaving: boolean;
}

const initialState: InteractionState = {
  formData: emptyForm,
  formStatus: 'draft',
  isSaving: false,
};

function hasFormData(formData: FormData) {
  return Object.values(formData).some(value =>
    typeof value === 'string'
      ? value !== ''
      : typeof value === 'boolean'
        ? value === true
        : Array.isArray(value)
          ? value.length > 0
          : false
  );
}

export const saveInteraction = createAsyncThunk(
  'interaction/saveInteraction',
  async (formData: FormData) => saveInteractionApi(formData)
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    populateFields(state, action: PayloadAction<Partial<FormData>>) {
      Object.entries(action.payload).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          state.formData[key as keyof FormData] = value as never;
        }
      });
      state.formStatus = hasFormData(state.formData) ? 'filled' : 'draft';
    },
    resetForm(state) {
      state.formData = emptyForm;
      state.formStatus = 'draft';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(saveInteraction.pending, state => {
        state.isSaving = true;
      })
      .addCase(saveInteraction.fulfilled, state => {
        state.isSaving = false;
        state.formStatus = 'saved';
      })
      .addCase(saveInteraction.rejected, state => {
        state.isSaving = false;
      });
  },
});

export const { populateFields, resetForm } = interactionSlice.actions;
export default interactionSlice.reducer;
