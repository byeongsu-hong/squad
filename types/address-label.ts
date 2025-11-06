export interface AddressLabel {
  address: string;
  label: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddressLabelFormData {
  address: string;
  label: string;
  description?: string;
  color?: string;
}
