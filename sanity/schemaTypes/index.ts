import { type SchemaTypeDefinition } from 'sanity';
import { userType } from './userType';
import { dashboardType } from "./dashboardType.tsx";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    dashboardType,
    userType,
  ],
}
