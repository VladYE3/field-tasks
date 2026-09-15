export type RootStackParamList = {
  MainTabs: undefined;
  TaskForm: { taskId?: string } | undefined;
  TaskDetail: { taskId: string };
};

export type MainTabParamList = {
  Tasks: undefined;
  Map: undefined;
  History: undefined;
  Settings: undefined;
};
