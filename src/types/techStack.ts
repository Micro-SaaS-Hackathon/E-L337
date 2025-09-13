export interface TechStack {
  frontend: {
    framework: string;
    styling: string[];
    stateManagement?: string;
    buildTool?: string;
  };
  backend: {
    language: string;
    framework: string;
    database: string;
    authentication?: string;
  };
  cloud: {
    provider: string;
    hosting: string;
    cdn?: string;
  };
  devops?: {
    ci_cd?: string;
    containerization?: string;
    monitoring?: string;
  };
  optional: {
    payment?: string;
    messageQueue?: string;
    analytics?: string;
    testing?: string;
  };
}
