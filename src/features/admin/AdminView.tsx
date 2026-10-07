import React, { useState } from 'react';
import {
  Settings, Building2, Shield, Users, ShieldAlert,
  History, CheckCircle2, XCircle, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { db } from '../../services/db/store';
import { Company, Branch, Warehouse, PosTerminal, User, ApprovalRequest, AuditLog } from '../../types/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AuditService } from '../../services/auditService';

import { downloadProjectSourceZip } from '../../utils/downloader';

export const AdminView: React.FC = () => {
  const { currentUser, hasPermission, activeBranch } = useAuth();
  const { success, warning, error: notifyError } = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'HIERARCHY' | 'USERS' | 'APPROVALS' | 'AUDIT'>('HIERARCHY');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const handleDownloadSource = async () => {
    try {
      setIsExporting(true);
      await downloadProjectSourceZip();
      success('Source Code Downloaded', 'Full project files bundled into .ZIP archive.');
    } catch (err: any) {
      notifyError('Download Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const companies = db.collection('companies').find();
  const branches = db.collection('branches').find();
  const warehouses = db.collection('warehouses').find();
  const terminals = db.collection('terminals').find();
  const users = db.collection('users').find();
  const approvals = db.collection('approvals').find();
  const auditLogs = AuditService.getLogs(60);

  const handleApproveRequest = (appr: ApprovalRequest) => {
    db.collection('approvals').updateOne(
      (a: ApprovalRequest) => a.id === appr.id,
      {
        status: 'APPROVED',
        approvedByUserId: currentUser.id,
        approvedByUserName: currentUser.fullName,
        resolvedAt: new Date().toISOString()
      }
    );

    // If linked to PO, also update PO status to approved
    if (appr.requestType === 'PURCHASE_ORDER' && appr.referenceId) {
      db.collection('purchaseOrders').updateOne(
        (p: any) => p.id === appr.referenceId,
        { status: 'APPROVED', approvedByUserId: currentUser.id }
      );
    }

    AuditService.log(
      currentUser,
      'APPROVAL_REQUEST_APPROVED',
      'APPROVALS',
      appr.id,
      { status: 'PENDING' },
      { status: 'APPROVED' },
      appr.branchId
    );

    success('Approval Granted', `Request for ${appr.description} has been approved.`);
  };

  const handleRejectRequest = (appr: ApprovalRequest) => {
    db.collection('approvals').updateOne(
      (a: ApprovalRequest) => a.id === appr.id,
      {
        status: 'REJECTED',
        approvedByUserId: currentUser.id,
        approvedByUserName: currentUser.fullName,
        resolvedAt: new Date().toISOString()
      }
    );

    AuditService.log(
      currentUser,
      'APPROVAL_REQUEST_REJECTED',
      'APPROVALS',
      appr.id,
      { status: 'PENDING' },
      { status: 'REJECTED' },
      appr.branchId
    );

    warning('Approval Rejected', `Request for ${appr.description} was rejected.`);
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            System Administration & Security
          </h2>
          <p className="text-xs text-slate-400">
            Multi-branch hierarchy, RBAC permission matrices, supervisor approval gates, and immutable audit logs
          </p>
        </div>

        <button
          onClick={handleDownloadSource}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg self-start sm:self-auto"
        >
          <Settings className="w-4 h-4" />
          <span>{isExporting ? 'Packing .ZIP...' : 'Download Full Source Code (.ZIP)'}</span>
        </button>
      </div>

      {/* Subtabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveSubTab('HIERARCHY')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'HIERARCHY' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Organization Hierarchy
          </span>
          {activeSubTab === 'HIERARCHY' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'USERS' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Users & Granular RBAC
          </span>
          {activeSubTab === 'USERS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('APPROVALS')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'APPROVALS' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Pending Approvals ({approvals.filter(a => a.status === 'PENDING').length})
          </span>
          {activeSubTab === 'APPROVALS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'AUDIT' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4" /> Immutable Audit Trail ({auditLogs.length})
          </span>
          {activeSubTab === 'AUDIT' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
      </div>

      {/* SUBTAB 1: ORGANIZATION HIERARCHY */}
      {activeSubTab === 'HIERARCHY' && (
        <div className="space-y-4">
          {companies.map((company: Company) => (
            <div key={company.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white">{company.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Code: {company.code} | Tax Reg: {company.taxNumber}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Primary Holding Entity
                </span>
              </div>

              {/* Branches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {branches.filter((b: Branch) => b.companyId === company.id).map((branch: Branch) => {
                  const bWarehouses = warehouses.filter((w: Warehouse) => w.branchId === branch.id);
                  const bTerminals = terminals.filter((t: PosTerminal) => t.branchId === branch.id);

                  return (
                    <div key={branch.id} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-white">{branch.name}</p>
                          <p className="text-[10px] font-mono text-emerald-400">{branch.code}</p>
                        </div>
                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {branch.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{branch.address}</p>

                      <div className="pt-2 border-t border-slate-800/60 text-[10px] space-y-1 font-mono text-slate-400">
                        <div>
                          <strong>Warehouses/Floors ({bWarehouses.length}):</strong>
                          <ul className="list-disc pl-3 text-slate-300">
                            {bWarehouses.map(w => (
                              <li key={w.id}>{w.name}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>POS Terminals ({bTerminals.length}):</strong>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {bTerminals.map(t => (
                              <span key={t.id} className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 border border-slate-800">
                                {t.terminalCode}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: USERS & RBAC */}
      {activeSubTab === 'USERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">User Name & Email</th>
                <th className="py-3 px-3">Role Designation</th>
                <th className="py-3 px-3">Supervisor Override PIN</th>
                <th className="py-3 px-3">Branch Access Scope</th>
                <th className="py-3 px-4">Permissions Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.map((u: User) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-xs">{u.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">@{u.username} • {u.email}</div>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-300 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-400">
                    {u.supervisorPin ? `PIN Set (${u.supervisorPin})` : 'No PIN'}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {u.branchIds.length} branches
                  </td>
                  <td className="py-3 px-4 text-[10px] font-mono text-slate-400">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {u.permissions.slice(0, 6).map((p, idx) => (
                        <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {p}
                        </span>
                      ))}
                      {u.permissions.length > 6 && (
                        <span className="text-slate-500 font-bold">+{u.permissions.length - 6} more</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB 3: PENDING APPROVALS */}
      {activeSubTab === 'APPROVALS' && (
        <div className="space-y-3">
          {approvals.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
              No approval requests logged in system.
            </div>
          ) : (
            approvals.map((appr: ApprovalRequest) => (
              <div
                key={appr.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                      {appr.requestType}
                    </span>
                    <span className="text-xs font-semibold text-white">{appr.description}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Requested by: <strong className="text-slate-300">{appr.requestedByUserName}</strong> •{' '}
                    {new Date(appr.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {appr.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleRejectRequest(appr)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-rose-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveRequest(appr)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow"
                      >
                        Approve Request
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        appr.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {appr.status} by {appr.approvedByUserName || 'Manager'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 4: IMMUTABLE AUDIT TRAIL */}
      {activeSubTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">Action Identifier</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-4 text-center">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="font-semibold text-white">{log.userName}</span>
                      <div className="text-[10px] text-slate-500 font-mono">{log.role}</div>
                    </td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{log.action}</td>
                    <td className="py-2 px-3 text-slate-300">{log.module}</td>
                    <td className="py-2 px-3 text-slate-400">{log.recordId}</td>
                    <td className="py-2 px-4 text-center font-sans">
                      {(log.beforeState || log.afterState) && (
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors inline-flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Inspect Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl p-6 text-slate-100 font-mono text-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Audit Snapshot: {selectedAuditLog.action}</span>
              <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              <div>
                <p className="font-bold text-slate-400 pb-1">BEFORE STATE</p>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedAuditLog.beforeState || null, null, 2)}
                </pre>
              </div>

              <div>
                <p className="font-bold text-emerald-400 pb-1">AFTER STATE</p>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[10px] text-emerald-300 overflow-x-auto">
                  {JSON.stringify(selectedAuditLog.afterState || null, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
