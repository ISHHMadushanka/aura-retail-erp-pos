import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (supervisorName: string) => void;
  actionTitle: string;
  actionDescription?: string;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  onClose,
  onAuthorized,
  actionTitle,
  actionDescription
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { verifySupervisorPin } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setErrorMsg('Please enter supervisor PIN');
      return;
    }

    const result = verifySupervisorPin(pin);
    if (result.valid && result.supervisor) {
      setErrorMsg('');
      setPin('');
      onAuthorized(result.supervisor.fullName);
      onClose();
    } else {
      setErrorMsg('Invalid Supervisor PIN. Access denied.');
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="font-semibold text-base text-white">Supervisor Authorization</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs uppercase tracking-wider font-bold text-amber-400">{actionTitle}</p>
          {actionDescription && <p className="text-xs text-slate-400 mt-1">{actionDescription}</p>}
        </div>

        <div className="mt-4">
          <input
            type="password"
            maxLength={6}
            value={pin}
            readOnly
            placeholder="••••"
            className="w-full text-center text-3xl font-mono tracking-widest py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 focus:outline-none"
          />
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs mt-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg font-bold text-lg text-slate-100 transition-colors"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="py-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 rounded-lg font-medium text-xs transition-colors"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg font-bold text-lg text-slate-100 transition-colors"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin(prev => prev.slice(0, -1))}
            className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-lg font-medium text-xs transition-colors"
          >
            DEL
          </button>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg"
          >
            Authorize
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-2">
          Demo PINs: Super Admin (9999), Store Manager (1234)
        </p>
      </div>
    </div>
  );
};
