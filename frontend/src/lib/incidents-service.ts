import { createResourceHooks } from "./create-resource-hooks";

export const INCIDENT_TYPES = [
  "MATERIAL_SHORTAGE",
  "ACTIVITY_DELAY",
  "WEATHER",
  "EQUIPMENT_DAMAGE",
  "STAFF_ISSUE",
  "ACTIVITY_CHANGE",
  "OTHER",
] as const;
export const INCIDENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const INCIDENT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED"] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface Incident {
  id: string;
  projectId: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  status: IncidentStatus;
  date: string;
  project?: { id: string; name: string };
}

export interface CreateIncidentInput {
  projectId: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
}

export const {
  useList: useIncidents,
  useCreate: useCreateIncident,
  useUpdate: useUpdateIncident,
} = createResourceHooks<Incident, CreateIncidentInput, { status: IncidentStatus }>("incidents", "/incidents");
