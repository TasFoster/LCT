/** Единый список маршрутов. Карта экранов: docs/architecture/pages.md */
export const ROUTES = {
  landing: '/',
  catalog: '/catalog',
  catalogItem: (id = ':itemId') => `/catalog/${id}`,
  demo: '/demo',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',

  projects: '/projects',
  newProject: '/projects/new',
  project: (id = ':projectId') => `/projects/${id}`,
  versions: (id = ':projectId') => `/projects/${id}/versions`,
  dashboard: (id = ':projectId') => `/projects/${id}/dashboard`,
  report: (id = ':projectId') => `/projects/${id}/report`,
  wizardStep: (id = ':projectId', step = ':step') => `/projects/${id}/wizard/${step}`,
  profile: '/profile',

  admin: '/admin',
  adminCatalog: '/admin/catalog',
  adminCatalogItem: (id = ':itemId') => `/admin/catalog/${id}`,
  adminRules: '/admin/rules',
  adminDictionaries: '/admin/dictionaries',
  adminAssumptions: '/admin/assumptions',
  adminUsers: '/admin/users',

  forbidden: '/403',
  notFound: '/404',

  wireframeParams: '/wireframes/params',
  wireframeDashboard: '/wireframes/dashboard',
} as const;

/** 8 шагов визарда: слаг, номер, заголовок. Порядок задаётся здесь. */
export const WIZARD_STEPS = [
  { slug: 'object', title: 'Тип объекта' },
  { slug: 'params', title: 'Параметры' },
  { slug: 'matching', title: 'Подбор' },
  { slug: 'comparison', title: 'Сравнение' },
  { slug: 'economics', title: 'Экономика' },
  { slug: 'scenarios', title: 'Сценарии' },
  { slug: 'topology', title: 'Визуализация' },
  { slug: 'export', title: 'Сохранение и экспорт' },
] as const;

export type WizardStepSlug = (typeof WIZARD_STEPS)[number]['slug'];
