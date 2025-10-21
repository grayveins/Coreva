import React, { createContext, useContext, useState, ReactNode } from "react";

export type OnboardingForm = {
  firstName?: string;
  email?: string;
  password?: string;
  gender?: string;
  age?: string;
  weight?: string;
  height?: string;
  goal?: string;
  weightGoal?: string;
  lifestyle?: string;
  specificGoal?: string;
  gymFocus?: string;
  planSummary?: string;
  gymEquipment?: string;
  gymLevel?: string;
  gymDays?: string[];
  story?: string;
};


interface OnboardingContextType {
  form: OnboardingForm;
  updateForm: (data: Partial<OnboardingForm>) => void;
  resetForm: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  form: {},
  updateForm: () => {},
  resetForm: () => {},
});

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [form, setForm] = useState<OnboardingForm>({});

  const updateForm = (data: Partial<OnboardingForm>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  const resetForm = () => setForm({});

  return (
    <OnboardingContext.Provider value={{ form, updateForm, resetForm }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
