import React from 'react';
import { ArrowUpRight, Monitor, FileCode2, Globe2 } from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';

export const FreeToolsSection: React.FC = () => {
  const { language } = useLanguage();
  const c = {
    en: { title:'One audit. Three specialist views.', sub:'Start with your live connection identity, then open a specialist view for deeper evidence. Everything here is free.', ip:'IP & Network', ipd:'IP, location, ASN, provider, VPN, proxy, Tor and reputation signals', browser:'Browser Intelligence', browserd:'Fingerprint surface, WebRTC, graphics and hardware', headers:'HTTP Headers', headersd:'Privacy, security, cookies and client-hint analysis' },
    ar: { title:'تدقيق واحد. ثلاث زوايا متخصصة.', sub:'ابدأ بهوية اتصالك الحية ثم افتح القسم المتخصص للحصول على أدلة أعمق. كل ذلك مجاني.', ip:'IP والشبكة', ipd:'العنوان والموقع وASN والمزوّد وVPN والبروكسي وTor وسمعة العنوان', browser:'ذكاء المتصفح', browserd:'سطح البصمة وWebRTC والرسوميات والعتاد', headers:'ترويسات HTTP', headersd:'الخصوصية والأمان وملفات الارتباط وClient Hints' },
    es: { title:'Una auditoría. Tres vistas especializadas.', sub:'Empieza con tu identidad de conexión en vivo y abre una vista especializada para más evidencia. Todo es gratis.', ip:'IP y red', ipd:'IP, ubicación, ASN, proveedor, VPN, proxy, Tor y reputación', browser:'Inteligencia del navegador', browserd:'Huella, WebRTC, gráficos y hardware', headers:'Cabeceras HTTP', headersd:'Privacidad, seguridad, cookies y Client Hints' },
    fr: { title:'Un audit. Trois vues spécialisées.', sub:'Commencez par votre identité de connexion en direct puis ouvrez une vue spécialisée pour plus de preuves. Tout est gratuit.', ip:'IP et réseau', ipd:'IP, localisation, ASN, fournisseur, VPN, proxy, Tor et réputation', browser:'Intelligence du navigateur', browserd:'Empreinte, WebRTC, graphiques et matériel', headers:'En-têtes HTTP', headersd:'Confidentialité, sécurité, cookies et Client Hints' },
    pt: { title:'Uma auditoria. Três visões especializadas.', sub:'Comece pela sua identidade de conexão em tempo real e abra uma visão especializada para mais evidências. Tudo é gratuito.', ip:'IP e rede', ipd:'IP, localização, ASN, provedor, VPN, proxy, Tor e reputação', browser:'Inteligência do navegador', browserd:'Fingerprint, WebRTC, gráficos e hardware', headers:'Cabeçalhos HTTP', headersd:'Privacidade, segurança, cookies e Client Hints' },
    tr: { title:'Tek denetim. Üç uzman görünümü.', sub:'Canlı bağlantı kimliğinizle başlayın, ardından daha derin kanıt için uzman görünümünü açın. Hepsi ücretsiz.', ip:'IP ve ağ', ipd:'IP, konum, ASN, sağlayıcı, VPN, proxy, Tor ve itibar sinyalleri', browser:'Tarayıcı istihbaratı', browserd:'Parmak izi yüzeyi, WebRTC, grafikler ve donanım', headers:'HTTP başlıkları', headersd:'Gizlilik, güvenlik, çerezler ve Client Hints' },
  }[language];
  const items = [
    [Globe2, '/', c.ip, c.ipd, 'cyan'],
    [Monitor, '/browser', c.browser, c.browserd, 'violet'],
    [FileCode2, '/headers', c.headers, c.headersd, 'blue'],
  ] as const;
  return <section className="space-y-4" aria-labelledby="free-tools-title"><div><h2 id="free-tools-title" className="text-xl font-bold text-slate-100">{c.title}</h2><p className="text-sm text-slate-400 mt-1">{c.sub}</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{items.map(([Icon,href,title,desc,tone])=><Link key={href} to={href} className="group rounded-2xl border border-slate-800 bg-slate-900/55 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all"><div className="flex items-start justify-between gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${tone==='cyan'?'bg-cyan-500/10 border-cyan-500/20 text-cyan-400':tone==='violet'?'bg-violet-500/10 border-violet-500/20 text-violet-400':'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}><Icon className="w-4 h-4"/></div><ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300"/></div><div className="mt-3 text-sm font-semibold text-slate-200">{title}</div><div className="text-xs leading-5 text-slate-500 mt-1">{desc}</div></Link>)}</div></section>;
};
