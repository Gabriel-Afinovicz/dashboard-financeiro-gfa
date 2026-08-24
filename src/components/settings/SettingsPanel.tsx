import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CreditCard, Database, Download, LogOut, Paintbrush, RotateCcw, ShieldCheck, Trash2, Upload, Wallet, X } from 'lucide-react';
import type { DataStore, FixedBill, FontOption, ThemeMode } from '../../types';
import { FONT_LABELS, useSettings } from '../../store/SettingsContext';
import { useData } from '../../store/DataContext';
import { useAuth } from '../../store/AuthContext';
import { useFixedBills } from '../../store/FixedBillsContext';
import { useToast } from '../../store/ToastContext';
import { currencyToCents, maskCurrency, toISO } from '../../lib/format';
import { Field, MoneyInput, Segmented, SelectInput, Switch, TextInput, btnGhost, btnIcon } from '../ui/controls';

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Preto & branco (automático)' },
  { value: '#10b981', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#f43f5e', label: 'Rosa' },
];

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, resolvedAccent } = useSettings();
  const { transactions, investments, sampleData, replaceAll, clearAll, loadSample } = useData();
  const { bills, replaceBills, clearBills } = useFixedBills();
  const { logout } = useAuth();
  const { push } = useToast();

  const [initialBalance, setInitialBalance] = useState(() => maskCurrency(String(settings.initialBalanceCents || '')));
  const [goal, setGoal] = useState(() => maskCurrency(String(settings.monthlyGoalCents || '')));
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInitialBalance(settings.initialBalanceCents ? maskCurrency(String(settings.initialBalanceCents)) : '');
    setGoal(settings.monthlyGoalCents ? maskCurrency(String(settings.monthlyGoalCents)) : '');
  }, [settings.initialBalanceCents, settings.monthlyGoalCents]);

  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);

  const commitMoney = (masked: string, key: 'initialBalanceCents' | 'monthlyGoalCents') => {
    const cents = masked ? currencyToCents(masked) : 0;
    if (cents !== settings[key]) {
      update({ [key]: cents });
      push('Configuração salva.');
    }
  };

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      data: { version: 1, transactions, investments, sampleData },
      fixedBills: bills,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-backup-${toISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push('Backup exportado.');
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = (parsed.data ?? parsed) as DataStore;
        if (data?.version !== 1 || !Array.isArray(data.transactions) || !Array.isArray(data.investments)) {
          push('Arquivo inválido. Selecione um backup exportado por este dashboard.', 'error');
          return;
        }
        await replaceAll({ ...data, sampleData: false });
        if (Array.isArray(parsed.fixedBills)) {
          replaceBills(parsed.fixedBills.filter((item: unknown): item is FixedBill => {
            if (!item || typeof item !== 'object') return false;
            const b = item as Partial<FixedBill>;
            return typeof b.id === 'string' && typeof b.description === 'string' && typeof b.amountCents === 'number';
          }));
        }
        if (parsed.settings) update(parsed.settings);
        push('Backup importado com sucesso.');
      } catch (err) {
        push(err instanceof Error && err.name === 'ApiError' ? err.message : 'Arquivo inválido. Selecione um backup exportado por este dashboard.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-bg transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Configurações"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">Configurações</h2>
          <button type="button" className={btnIcon} onClick={onClose} aria-label="Fechar configurações">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
          {/* Aparência */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-faint uppercase">
              <Paintbrush className="h-3.5 w-3.5" /> Aparência
            </h3>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Tema</span>
              <Segmented<ThemeMode>
                options={[
                  { value: 'dark', label: 'Escuro' },
                  { value: 'light', label: 'Claro' },
                ]}
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                size="sm"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm">Cor de destaque</span>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const active = settings.accent === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      onClick={() => update({ accent: preset.value })}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        active ? 'border-fg' : 'border-line'
                      }`}
                      style={
                        preset.value === 'auto'
                          ? { background: 'linear-gradient(135deg, #0a0a0a 50%, #fafafa 50%)' }
                          : { background: preset.value }
                      }
                    />
                  );
                })}
                <label
                  className="relative h-8 w-8 cursor-pointer rounded-full border-2 border-line transition-transform hover:scale-110"
                  style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #10b981, #3b82f6, #8b5cf6, #f43f5e)' }}
                  title="Cor personalizada"
                >
                  <input
                    type="color"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    value={settings.accent === 'auto' ? resolvedAccent : settings.accent}
                    onChange={(e) => update({ accent: e.target.value })}
                    aria-label="Cor personalizada"
                  />
                </label>
              </div>
            </div>

            <Field label="Fonte">
              <SelectInput value={settings.font} onChange={(e) => update({ font: e.target.value as FontOption })}>
                {(Object.keys(FONT_LABELS) as FontOption[]).map((f) => (
                  <option key={f} value={f}>
                    {FONT_LABELS[f]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Tamanho do texto</span>
              <Segmented<number>
                options={[
                  { value: 0.875, label: 'P' },
                  { value: 1, label: 'M' },
                  { value: 1.125, label: 'G' },
                ]}
                value={settings.fontScale}
                onChange={(fontScale) => update({ fontScale })}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">Animações</p>
                <p className="text-xs text-faint">Transições e contadores animados</p>
              </div>
              <Switch checked={settings.animations} onChange={(animations) => update({ animations })} label="Animações" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">Modo privado</p>
                <p className="text-xs text-faint">Oculta todos os valores monetários</p>
              </div>
              <Switch checked={settings.privacy} onChange={(privacy) => update({ privacy })} label="Modo privado" />
            </div>
          </section>

          {/* Finanças */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-faint uppercase">
              <Wallet className="h-3.5 w-3.5" /> Finanças
            </h3>

            <Field label="Saldo inicial da conta" hint="Ponto de partida do cálculo do saldo (aplicado ao sair do campo).">
              <MoneyInput
                value={initialBalance}
                onChange={setInitialBalance}
                onBlur={() => commitMoney(initialBalance, 'initialBalanceCents')}
              />
            </Field>

            <Field label="Meta de economia mensal" hint="Usada no anel de progresso do dashboard.">
              <MoneyInput value={goal} onChange={setGoal} onBlur={() => commitMoney(goal, 'monthlyGoalCents')} />
            </Field>

            <div className="pt-2 border-t border-line space-y-3">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <CreditCard className="h-3.5 w-3.5" /> Cartão de Crédito - Fatura
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fechamento da fatura" hint="Dia em que a fatura corta.">
                  <SelectInput
                    value={String(settings.creditCardClosingDay ?? 3)}
                    onChange={(e) => update({ creditCardClosingDay: Number(e.target.value) })}
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Vencimento da fatura" hint="Dia de pagamento.">
                  <SelectInput
                    value={String(settings.creditCardDueDay ?? 10)}
                    onChange={(e) => update({ creditCardDueDay: Number(e.target.value) })}
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/50">
                <Field label="Spread do Banco (%)" hint="Taxa do Itaú/banco (ex: 5.5)">
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    value={String(settings.cardSpreadPct ?? 5.5)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        update({ cardSpreadPct: val });
                      }
                    }}
                  />
                </Field>
                <Field label="IOF Cartão (%)" hint="Imposto federal (ex: 4.38)">
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={String(settings.cardIofPct ?? 4.38)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        update({ cardIofPct: val });
                      }
                    }}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-faint">
                Usados para calcular o valor real descontado em compras e contas fixas em Dólar.
              </p>
            </div>
          </section>

          {/* Dados */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-faint uppercase">
              <Database className="h-3.5 w-3.5" /> Dados
            </h3>
            <p className="text-xs text-faint">
              Transações e investimentos ficam no PostgreSQL. Contas fixas, por enquanto, ficam só neste
              navegador. O backup em JSON guarda os dois.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btnGhost} onClick={exportBackup}>
                <Download className="h-4 w-4" /> Exportar
              </button>
              <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Importar
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importBackup(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              className={`${btnGhost} w-full`}
              onClick={async () => {
                try {
                  await loadSample();
                  push('Dados de exemplo recarregados.', 'info');
                } catch (err) {
                  push(err instanceof Error ? err.message : 'Erro ao recarregar exemplos.', 'error');
                }
              }}
            >
              <RotateCcw className="h-4 w-4" /> Recarregar dados de exemplo
            </button>

            {confirmClear ? (
              <div className="space-y-2 rounded-xl border border-neg/40 bg-neg/5 p-3">
                <p className="flex items-center gap-2 text-xs font-medium text-neg">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Isso apaga todas as transações e investimentos. Não dá para desfazer.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-neg px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    onClick={async () => {
                      try {
                        await clearAll();
                        clearBills();
                        setConfirmClear(false);
                        push('Todos os dados foram apagados.', 'info');
                      } catch (err) {
                        push(err instanceof Error ? err.message : 'Erro ao apagar os dados.', 'error');
                      }
                    }}
                  >
                    Apagar tudo
                  </button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmClear(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neg/40 px-4 py-2.5 text-sm font-medium text-neg transition hover:bg-neg/10"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="h-4 w-4" /> Apagar todos os dados
              </button>
            )}
          </section>

          {/* Acesso */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-faint uppercase">
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso
            </h3>
            <p className="text-xs text-faint">
              O dashboard é privado: sem a senha, nada é exibido. A sessão neste navegador vale 30 dias.
            </p>
            <button
              type="button"
              className={`${btnGhost} w-full`}
              onClick={() => {
                onClose();
                logout();
              }}
            >
              <LogOut className="h-4 w-4" /> Sair desta sessão
            </button>
          </section>
        </div>

        <footer className="border-t border-line px-5 py-3 text-center text-xs text-faint">
          Dashboard Financeiro · v0.3 · PostgreSQL privado
        </footer>
      </aside>
    </>
  );
}
