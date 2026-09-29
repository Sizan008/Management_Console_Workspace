export interface ButtonState {
  visible: boolean;
  enabled: boolean;
}

export interface ButtonActionsModel {
  save?: boolean | ButtonState,
  saveNext?: boolean | ButtonState,
  update?: boolean | ButtonState,
  updateNext?: boolean | ButtonState,
  view?: boolean | ButtonState,
  delete?: boolean | ButtonState,
  exit?: boolean | ButtonState,
  reset?: boolean | ButtonState,
  customAction?: boolean | ButtonState,// 👈 optional
  customButton?: {
    customAction: boolean,
    customLevel: string,
    customIcon: string;
  }
}
