export {
  getPendingApprovals,
  getAllApprovals,
  approveRequest,
  rejectRequest,
  createApprovalRequest,
  getApprovalConfig,
  needsApproval,
} from './approvalService';

export type { ApprovalWithDetails, ApprovalConfig } from './approvalService';
