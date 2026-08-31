import React, { useMemo } from 'react';
import { Fingerprint, Info } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { BrowserProfile } from '../types';

function estimateFingerprintBits(profile: BrowserProfile): { bits: number; measured: number; highCardinality: number } {
  const signals: Array<[unknown, number, boolean]> = [
    [profile.groups.IDENTITY?.data && (profile.groups.IDENTITY.data as any).browserFamily, 4, true],
    [profile.groups.IDENTITY?.data && (profile.groups.IDENTITY.data as any).osFamily, 3, true],
    [profile.groups.DISPLAY?.data && (profile.groups.DISPLAY.data as any).width, 8, true],
    [profile.groups.DISPLAY?.data && (profile.groups.DISPLAY.data as any).height, 8, true],
    [profile.groups.DISPLAY?.data && (profile.groups.DISPLAY.data as any).devicePixelRatio, 4, true],
    [profile.groups.LOCALE?.data && (profile.groups.LOCALE.data as any).language, 3, true],
    [profile.groups.TIMEZONE?.data && (profile.groups.TIMEZONE.data as any).timezone, 6, true],
    [profile.groups.HARDWARE?.data && (profile.groups.HARDWARE.data as any).cpuCores, 5, true],
    [profile.groups.HARDWARE?.data && (profile.groups.HARDWARE.data as any).deviceMemory, 4, true],
    [profile.groups.GRAPHICS?.derivedSignals?.webglStatus, 2, false],
    [profile.groups.GRAPHICS?.derivedSignals?.gpuUnmasked, 1, false],
    [profile.groups.GRAPHICS?.derivedSignals?.webglRenderer, 7, true],
    [profile.groups.GRAPHICS?.derivedSignals?.canvasHash, 8, true],
    [profile.groups.AUDIO?.derivedSignals?.audioHash, 7, true],
    [profile.groups.WEBRTC?.data && (profile.groups.WEBRTC.data as any).localIps?.length, 2, true],
  ];
  let bits = 0; let measured = 0; let highCardinality = 0;
  for (const [value, contribution, high] of signals) {
    const present = value !== null && value !== undefined && value !== '' && value !== 'UNAVAILABLE' && value !== 'UNKNOWN';
    if (present) { bits += contribution; measured += 1; if (high) highCardinality += 1; }
  }
  return { bits: Math.min(80, bits), measured, highCardinality };
}

export const FingerprintExposureCard: React.FC<{ profile: BrowserProfile }> = ({ profile }) => {
  const { language } = useLanguage();
  const c = {
    en:{title:'Fingerprint exposure',subtitle:'Heuristic entropy estimate from signals actually observed in this browser.',bits:'Estimated entropy',distinct:'Distinctiveness',measured:'Measured signals',note:'This is an on-device heuristic, not a claim of global uniqueness. A population-wide uniqueness percentage requires a large reference dataset.'},
    ar:{title:'التعرض للبصمة',subtitle:'تقدير استدلالي للانتروبيا اعتمادًا على الإشارات المقاسة فعليًا في هذا المتصفح.',bits:'الانتروبيا التقديرية',distinct:'التميّز',measured:'الإشارات المقاسة',note:'هذا تقدير محلي استدلالي وليس ادعاءً بالتفرد عالميًا. النسبة العالمية تحتاج إلى قاعدة مرجعية كبيرة.'},
    es:{title:'Exposición de huella',subtitle:'Estimación heurística basada en señales realmente observadas en este navegador.',bits:'Entropía estimada',distinct:'Distintividad',measured:'Señales medidas',note:'Es una heurística local, no una afirmación de unicidad global. Para una cifra global se requiere un gran conjunto de referencia.'},
    fr:{title:'Exposition de l’empreinte',subtitle:'Estimation heuristique à partir des signaux réellement observés dans ce navigateur.',bits:'Entropie estimée',distinct:'Distinctivité',measured:'Signaux mesurés',note:'C’est une heuristique locale, pas une preuve d’unicité mondiale. Une estimation globale nécessite un grand jeu de référence.'},
    pt:{title:'Exposição da impressão digital',subtitle:'Estimativa heurística baseada nos sinais realmente observados neste navegador.',bits:'Entropia estimada',distinct:'Distintividade',measured:'Sinais medidos',note:'É uma heurística local, não uma afirmação de unicidade global. Um valor global exige um grande conjunto de referência.'},
    tr:{title:'Parmak izi maruziyeti',subtitle:'Bu tarayıcıda gerçekten ölçülen sinyallerden oluşturulan buluşsal entropi tahmini.',bits:'Tahmini entropi',distinct:'Ayırt edilebilirlik',measured:'Ölçülen sinyaller',note:'Bu yerel bir buluşsal tahmindir; küresel benzersizlik iddiası değildir. Küresel oran için büyük bir referans veri seti gerekir.'},
  }[language];
  const {bits, measured, highCardinality} = useMemo(()=>estimateFingerprintBits(profile),[profile]);
  const distinct = highCardinality >= 8 ? 'HIGH' : highCardinality >= 4 ? 'MEDIUM' : 'LOW';
  const distinctLabel = distinct==='HIGH' ? (language==='ar'?'مرتفع':language==='fr'?'Élevée':language==='es'?'Alta':language==='pt'?'Alta':language==='tr'?'Yüksek':'High') : distinct==='MEDIUM' ? (language==='ar'?'متوسط':language==='fr'?'Moyenne':language==='es'?'Media':language==='pt'?'Média':language==='tr'?'Orta':'Medium') : (language==='ar'?'منخفض':language==='fr'?'Faible':language==='es'?'Baja':language==='pt'?'Baixa':language==='tr'?'Düşük':'Low');
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5" aria-labelledby="fingerprint-exposure-title"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center"><Fingerprint className="w-4 h-4"/></div><div><h2 id="fingerprint-exposure-title" className="text-sm font-bold text-slate-100">{c.title}</h2><p className="text-xs text-slate-500 mt-1">{c.subtitle}</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3"><div className="text-[10px] text-slate-500">{c.bits}</div><div className="text-xl font-bold text-slate-100 mt-1">{bits} <span className="text-xs text-slate-500">bits</span></div></div><div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3"><div className="text-[10px] text-slate-500">{c.distinct}</div><div className="text-xl font-bold text-fuchsia-300 mt-1">{distinctLabel}</div></div><div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3"><div className="text-[10px] text-slate-500">{c.measured}</div><div className="text-xl font-bold text-slate-100 mt-1">{measured}</div></div></div><div className="mt-4 flex gap-2 text-[11px] leading-5 text-slate-500"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600"/>{c.note}</div></section>;
};
