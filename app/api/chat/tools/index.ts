// app/api/chat/tools/index.ts

import { pendingQuotationsTool } from "./pending_quotations";
// import { followUpTool } from './follow_up';
// import { pendingVisitsTool } from './pending_visits';

export const crmTools = {
  get_pending_quotations: pendingQuotationsTool,
  // get_follow_ups: followUpTool,
  // get_pending_visits: pendingVisitsTool,
};
