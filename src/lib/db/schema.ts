import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  primaryKey,
  unique,
  jsonb,
  pgSchema
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* Reference to Supabase auth.users — declared but not managed by Drizzle */
const authSchema = pgSchema('auth');
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey()
});

/* ----- Identity & teams ----- */

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  initials: text('initials'),
  role: text('role', { enum: ['admin', 'bauleiter'] }).default('bauleiter').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  an: text('an').default('Hofmann Haus').notNull(),
  archived: boolean('archived').default(false).notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'bauleiter', 'viewer'] }).default('bauleiter').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.projectId, t.userId] }) })
);

/* ----- Buildings ----- */

export const houses = pgTable('houses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const apartments = pgTable('apartments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  houseId: uuid('house_id').notNull().references(() => houses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  sizeQm: numeric('size_qm'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Gewerke catalog ----- */

export const gewerke = pgTable('gewerke', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  color: text('color').notNull(),
  defaultPerApartment: boolean('default_per_apartment').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Checklists (catalog) ----- */

export const checklists = pgTable('checklists', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  num: integer('num').notNull(),
  title: text('title').notNull(),
  scope: text('scope', { enum: ['project', 'house', 'apartment'] }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull()
});

export const checklistSections = pgTable('checklist_sections', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  checklistId: uuid('checklist_id').notNull().references(() => checklists.id, { onDelete: 'cascade' }),
  title: text('title'),
  sortOrder: integer('sort_order').default(0).notNull()
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sectionId: uuid('section_id').notNull().references(() => checklistSections.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').default(0).notNull()
});

export const checklistProgress = pgTable(
  'checklist_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => checklistItems.id, { onDelete: 'cascade' }),
    scopeKey: text('scope_key').notNull(),
    done: boolean('done').default(false).notNull(),
    doneDate: date('done_date'),
    doneBy: uuid('done_by').references(() => profiles.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ uniq: unique().on(t.projectId, t.itemId, t.scopeKey) })
);

export const checklistPhotos = pgTable('checklist_photos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  progressId: uuid('progress_id').notNull().references(() => checklistProgress.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  width: integer('width'),
  height: integer('height'),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Bauzeitenplan ----- */

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  num: text('num'),
  name: text('name').notNull(),
  gewerkId: uuid('gewerk_id').references(() => gewerke.id),
  parentId: uuid('parent_id'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  durationAt: integer('duration_at'),
  color: text('color'),
  depth: integer('depth').default(0).notNull(),
  perApartment: boolean('per_apartment').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  notes: text('notes'),
  progressPct: integer('progress_pct').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const taskDependencies = pgTable(
  'task_dependencies',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    predecessorId: uuid('predecessor_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    successorId: uuid('successor_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['FS', 'SS', 'FF', 'SF'] }).default('FS').notNull(),
    lagDays: integer('lag_days').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ uniq: unique().on(t.predecessorId, t.successorId) })
);

export const taskPhotos = pgTable('task_photos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').default(0).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const taskBaselines = pgTable('task_baselines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  plannedStart: date('planned_start').notNull(),
  plannedEnd: date('planned_end').notNull(),
  snapshotLabel: text('snapshot_label').notNull(),
  snapshotAt: timestamp('snapshot_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => profiles.id)
});

export const taskApartmentProgress = pgTable(
  'task_apartment_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    apartmentId: uuid('apartment_id').notNull().references(() => apartments.id, { onDelete: 'cascade' }),
    plannedStart: date('planned_start'),
    plannedEnd: date('planned_end'),
    done: boolean('done').default(false).notNull(),
    doneDate: date('done_date'),
    doneBy: uuid('done_by').references(() => profiles.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ uniq: unique().on(t.taskId, t.apartmentId) })
);

/* ----- Mängel ----- */

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  version: integer('version').default(1).notNull(),
  storagePath: text('storage_path').notNull(),
  pageCount: integer('page_count'),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  supersededBy: uuid('superseded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  gewerkId: uuid('gewerk_id').references(() => gewerke.id),
  company: text('company'),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const defects = pgTable('defects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  shortId: text('short_id'),
  planId: uuid('plan_id').references(() => plans.id),
  page: integer('page'),
  xPct: numeric('x_pct'),
  yPct: numeric('y_pct'),
  planCropPath: text('plan_crop_path'),
  apartmentId: uuid('apartment_id').references(() => apartments.id),
  gewerkId: uuid('gewerk_id').references(() => gewerke.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  title: text('title').notNull(),
  description: text('description'),
  deadline: date('deadline'),
  status: text('status', {
    enum: ['open', 'sent', 'acknowledged', 'resolved', 'accepted', 'rejected', 'reopened']
  }).default('open').notNull(),
  priority: integer('priority').default(2).notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => profiles.id),
  followupDate: date('followup_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const defectPhotos = pgTable('defect_photos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  defectId: uuid('defect_id').notNull().references(() => defects.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').default(0).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const defectHistory = pgTable('defect_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  defectId: uuid('defect_id').notNull().references(() => defects.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  byUser: uuid('by_user').references(() => profiles.id),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Gewerk-Checklisten je Wohnung (Bruders Punkt) ----- */

export const gewerkChecklistTemplates = pgTable('gewerk_checklist_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gewerkId: uuid('gewerk_id').notNull().references(() => gewerke.id, { onDelete: 'cascade' }),
  item: text('item').notNull(),
  requiresPhoto: boolean('requires_photo').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull()
});

export const gewerkChecklistProgress = pgTable(
  'gewerk_checklist_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    gewerkId: uuid('gewerk_id').notNull().references(() => gewerke.id),
    apartmentId: uuid('apartment_id').notNull().references(() => apartments.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').notNull().references(() => gewerkChecklistTemplates.id, { onDelete: 'cascade' }),
    done: boolean('done').default(false).notNull(),
    photos: jsonb('photos').default(sql`'[]'::jsonb`),
    notes: text('notes'),
    doneBy: uuid('done_by').references(() => profiles.id),
    doneDate: date('done_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ uniq: unique().on(t.projectId, t.apartmentId, t.templateId) })
);

/* ----- Musterdetails ----- */

export const musterdetails = pgTable('musterdetails', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  storagePath: text('storage_path').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Textbausteine (defect-text snippets per gewerk) ----- */

export const textbausteine = pgTable('textbausteine', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gewerkId: uuid('gewerk_id').references(() => gewerke.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  body: text('body').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Defect-Templates (1-Klick-Erfassung) ----- */

export const defectTemplates = pgTable('defect_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id'),
  name: text('name').notNull(),
  beschreibung: text('beschreibung').notNull(),
  gewerkId: uuid('gewerk_id').references(() => gewerke.id, { onDelete: 'set null' }),
  defaultBauteil: text('default_bauteil'),
  defaultFristTage: integer('default_frist_tage'),
  defaultPriority: integer('default_priority'),
  fotoHinweis: text('foto_hinweis'),
  useCount: integer('use_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/* ----- Activity feed ----- */

export const activity = pgTable('activity', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => profiles.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  refTable: text('ref_table'),
  refId: uuid('ref_id'),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull()
});

/* Type exports */
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type House = typeof houses.$inferSelect;
export type Apartment = typeof apartments.$inferSelect;
export type Gewerk = typeof gewerke.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type Defect = typeof defects.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Activity = typeof activity.$inferSelect;
