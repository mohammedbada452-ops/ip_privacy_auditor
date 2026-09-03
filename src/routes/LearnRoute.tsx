import React from 'react';
import { BookOpen, Fingerprint, Globe2, ShieldCheck, Network, LockKeyhole, ArrowUpRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '../router/Router';
import { useLanguage } from '../i18n/LanguageContext';
import { useRouter } from '../router/Router';
import { SEOHead } from '../components/seo/SEOHead';

const content = {
 en:{title:'PrivaSec Privacy & Security Learning Center',desc:'Practical guides to IP privacy, browser fingerprinting, WebRTC, security headers and IP reputation.',intro:'Understand what websites can observe, what the signals mean, and how to reduce unnecessary exposure. Every guide connects to a free PrivaSec audit.',read:'Read guide',cards:[['ip','What can your IP reveal?','Public IP, ASN, geolocation, RDAP, DNS and reputation.', '/', Globe2],['fingerprint','How browser fingerprinting works','Understand entropy, signal combinations and exposure.', '/browser', Fingerprint],['webrtc','What WebRTC can reveal','Learn the difference between browser capability and a proven leak.', '/browser', Network],['headers','Security & privacy headers','HSTS, CSP, Permissions-Policy and Referrer-Policy.', '/headers', ShieldCheck],['reputation','How IP reputation works','Reports, hosting signals, confidence and limitations.', '/', LockKeyhole]]},
 ar:{title:'مركز PrivaSec للتعلم في الخصوصية والأمان',desc:'أدلة عملية عن خصوصية IP وبصمة المتصفح وWebRTC وترويسات الأمان وسمعة IP.',intro:'افهم ما الذي تستطيع المواقع ملاحظته وما تعنيه الإشارات وكيف تقلل التعرض غير الضروري. كل دليل مرتبط بفحص مجاني.',read:'قراءة الدليل',cards:[['ip','ماذا يكشف IP عنك؟','العنوان العام وASN والموقع وRDAP وDNS والسمعة.','/',Globe2],['fingerprint','كيف تعمل بصمة المتصفح؟','افهم الإنتروبيا ومجموعات الإشارات وسطح التعرض.','/browser',Fingerprint],['webrtc','ماذا يمكن أن يكشف WebRTC؟','الفرق بين قدرة المتصفح والتسريب المثبت.','/browser',Network],['headers','ترويسات الأمان والخصوصية','HSTS وCSP وPermissions-Policy وReferrer-Policy.','/headers',ShieldCheck],['reputation','كيف تعمل سمعة IP؟','التقارير والاستضافة والثقة والقيود.','/',LockKeyhole]]},
 es:{title:'Centro de aprendizaje de privacidad y seguridad de PrivaSec',desc:'Guías prácticas sobre privacidad IP, fingerprinting, WebRTC, cabeceras y reputación IP.',intro:'Comprende qué pueden observar los sitios y cómo reducir la exposición innecesaria.',read:'Leer guía',cards:[['ip','¿Qué puede revelar tu IP?','IP pública, ASN, geolocalización, RDAP, DNS y reputación.','/',Globe2],['fingerprint','Cómo funciona el fingerprinting','Entropía, señales combinadas y exposición.','/browser',Fingerprint],['webrtc','Qué puede revelar WebRTC','Diferencia entre capacidad y fuga demostrada.','/browser',Network],['headers','Cabeceras de seguridad y privacidad','HSTS, CSP, Permissions-Policy y Referrer-Policy.','/headers',ShieldCheck],['reputation','Cómo funciona la reputación IP','Informes, hosting, confianza y límites.','/',LockKeyhole]]},
 fr:{title:'Centre d’apprentissage confidentialité et sécurité PrivaSec',desc:'Guides pratiques sur la confidentialité IP, l’empreinte, WebRTC, les en-têtes et la réputation IP.',intro:'Comprenez ce que les sites peuvent observer et comment réduire l’exposition inutile.',read:'Lire le guide',cards:[['ip','Que révèle votre IP ?','IP publique, ASN, géolocalisation, RDAP, DNS et réputation.','/',Globe2],['fingerprint','Empreinte du navigateur','Entropie, signaux combinés et exposition.','/browser',Fingerprint],['webrtc','Ce que WebRTC peut révéler','Différence entre capacité et fuite démontrée.','/browser',Network],['headers','En-têtes sécurité et confidentialité','HSTS, CSP, Permissions-Policy et Referrer-Policy.','/headers',ShieldCheck],['reputation','Réputation IP','Signalements, hébergement, confiance et limites.','/',LockKeyhole]]},
 pt:{title:'Centro de aprendizado de privacidade e segurança PrivaSec',desc:'Guias práticos sobre privacidade IP, fingerprinting, WebRTC, cabeçalhos e reputação IP.',intro:'Entenda o que sites podem observar e como reduzir exposição desnecessária.',read:'Ler guia',cards:[['ip','O que seu IP pode revelar?','IP público, ASN, geolocalização, RDAP, DNS e reputação.','/',Globe2],['fingerprint','Como funciona o fingerprinting','Entropia, sinais combinados e exposição.','/browser',Fingerprint],['webrtc','O que o WebRTC pode revelar','Diferença entre capacidade e vazamento comprovado.','/browser',Network],['headers','Cabeçalhos de segurança e privacidade','HSTS, CSP, Permissions-Policy e Referrer-Policy.','/headers',ShieldCheck],['reputation','Como funciona a reputação IP','Relatórios, hospedagem, confiança e limites.','/',LockKeyhole]]},
 tr:{title:'PrivaSec Gizlilik ve Güvenlik Öğrenme Merkezi',desc:'IP gizliliği, tarayıcı parmak izi, WebRTC, güvenlik başlıkları ve IP itibarı rehberleri.',intro:'Sitelerin neleri görebileceğini ve gereksiz görünürlüğü nasıl azaltabileceğinizi öğrenin.',read:'Rehberi oku',cards:[['ip','IP adresiniz neleri gösterir?','Genel IP, ASN, konum, RDAP, DNS ve itibar.','/',Globe2],['fingerprint','Tarayıcı parmak izi','Entropi, sinyal birleşimleri ve görünürlük.','/browser',Fingerprint],['webrtc','WebRTC neleri gösterebilir?','Yetenek ile kanıtlanmış sızıntı arasındaki fark.','/browser',Network],['headers','Güvenlik ve gizlilik başlıkları','HSTS, CSP, Permissions-Policy ve Referrer-Policy.','/headers',ShieldCheck],['reputation','IP itibarı nasıl çalışır?','Raporlar, barındırma, güven ve sınırlar.','/',LockKeyhole]]}
};

type Guide = {
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  checklist: string[];
};

const guides: Record<string, Partial<Record<'en'|'ar'|'es'|'fr'|'pt'|'tr', Guide>>> = {
  ip: {
    en: {
      title: 'What can your IP reveal?',
      intro: 'Your public IP is a network identifier. It can be correlated with provider, ASN, approximate geography, reputation and routing characteristics.',
      sections: [
        { title: 'What PrivaSec checks', body: 'The audit combines the server-observed address with RDAP, DNS and configured public intelligence providers. Location is presented as approximate evidence, not as a physical-location claim.' },
        { title: 'What the signals mean', body: 'ASN and provider identify the network that announced or serves the address. Proxy, VPN, Tor and hosting classifications indicate routing or infrastructure evidence rather than certainty about the person using the connection.' },
        { title: 'How to reduce exposure', body: 'Use privacy-preserving network services when appropriate, avoid publishing your IP unnecessarily, and review provider and DNS behavior when anonymity matters.' },
      ],
      checklist: ['Separate network evidence from physical location.', 'Check provider agreement and confidence.', 'Re-scan after changing your network path.'],
    },
    ar: {
      title: 'ماذا يمكن أن يكشف عنوان IP عنك؟',
      intro: 'عنوان IP العام هو معرّف للشبكة. يمكن ربطه بالمزوّد وASN والموقع التقريبي والسمعة وخصائص مسار الاتصال.',
      sections: [
        { title: 'ما الذي يفحصه PrivaSec', body: 'يجمع الفحص العنوان الذي رآه الخادم مع RDAP وDNS ومصادر الاستخبارات العامة المكوّنة. الموقع يُعرض كدليل تقريبي ولا يثبت الموقع الفعلي.' },
        { title: 'ماذا تعني الإشارات', body: 'يحدد ASN والمزوّد الشبكة المرتبطة بالعنوان. تصنيفات Proxy وVPN وTor والاستضافة تعبّر عن أدلة تتعلق بالمسار أو البنية التحتية وليست حكماً قاطعاً على هوية المستخدم.' },
        { title: 'كيف تقلل الانكشاف', body: 'استخدم خدمات شبكية مناسبة للخصوصية عند الحاجة، وتجنب نشر عنوان IP بلا داعٍ، وراجع سلوك المزوّد وDNS عندما تكون السرية مهمة.' },
      ],
      checklist: ['افصل بين دليل الشبكة وبين تحديد الموقع الفعلي.', 'راجع اتفاق المصادر ومستوى الثقة.', 'أعد الفحص بعد تغيير مسار الشبكة.'],
    },
    es: {
      title: '¿Qué puede revelar tu IP?',
      intro: 'Tu IP pública es un identificador de red que puede relacionarse con el proveedor, ASN, geolocalización aproximada, reputación y ruta.',
      sections: [
        { title: 'Qué comprueba PrivaSec', body: 'Combina la IP observada por el servidor con RDAP, DNS y fuentes públicas configuradas. La ubicación se muestra como evidencia aproximada, no como ubicación física exacta.' },
        { title: 'Qué significan las señales', body: 'El ASN y el proveedor describen la red asociada. Las clasificaciones de proxy, VPN, Tor y hosting describen evidencia de infraestructura o ruta, no certeza sobre la persona.' },
        { title: 'Cómo reducir la exposición', body: 'Usa servicios de red orientados a la privacidad cuando corresponda y revisa el proveedor y DNS cuando necesites mayor privacidad.' },
      ],
      checklist: ['Separa evidencia de red de ubicación física.', 'Comprueba la confianza de las fuentes.', 'Vuelve a escanear después de cambiar la ruta.'],
    },
    fr: {
      title: 'Que révèle votre IP ?',
      intro: 'Votre IP publique est un identifiant réseau qui peut être relié au fournisseur, à l’ASN, à une géolocalisation approximative, à la réputation et au routage.',
      sections: [
        { title: 'Ce que vérifie PrivaSec', body: 'L’audit combine l’adresse observée par le serveur avec RDAP, DNS et les sources publiques configurées. La localisation reste approximative.' },
        { title: 'Ce que signifient les signaux', body: 'L’ASN et le fournisseur décrivent le réseau associé. Les classifications proxy, VPN, Tor et hébergement reflètent des indices de routage ou d’infrastructure.' },
        { title: 'Réduire l’exposition', body: 'Utilisez des services réseau respectueux de la vie privée lorsque nécessaire et vérifiez le comportement du fournisseur et du DNS.' },
      ],
      checklist: ['Séparer réseau et localisation physique.', 'Vérifier le niveau de confiance.', 'Relancer l’analyse après un changement de route.'],
    },
    pt: {
      title: 'O que seu IP pode revelar?',
      intro: 'Seu IP público é um identificador de rede que pode ser associado ao provedor, ASN, geolocalização aproximada, reputação e roteamento.',
      sections: [
        { title: 'O que o PrivaSec verifica', body: 'A auditoria combina o endereço observado pelo servidor com RDAP, DNS e fontes públicas configuradas. A localização é aproximada.' },
        { title: 'O que os sinais significam', body: 'ASN e provedor descrevem a rede associada. Proxy, VPN, Tor e hospedagem indicam evidências de infraestrutura ou rota, não certeza sobre a pessoa.' },
        { title: 'Como reduzir a exposição', body: 'Use serviços de rede voltados à privacidade quando necessário e revise provedor e DNS quando a privacidade for importante.' },
      ],
      checklist: ['Separe evidência de rede de localização física.', 'Confira confiança e concordância das fontes.', 'Faça uma nova varredura após mudar a rota.'],
    },
    tr: {
      title: 'IP adresiniz neleri gösterebilir?',
      intro: 'Genel IP adresiniz bir ağ tanımlayıcısıdır; sağlayıcı, ASN, yaklaşık konum, itibar ve yönlendirme özellikleriyle ilişkilendirilebilir.',
      sections: [
        { title: 'PrivaSec neyi kontrol eder', body: 'Denetim, sunucunun gözlemlediği adresi RDAP, DNS ve yapılandırılmış açık istihbarat kaynaklarıyla birleştirir. Konum yaklaşık kanıt olarak sunulur.' },
        { title: 'Sinyaller ne anlama gelir', body: 'ASN ve sağlayıcı ilişkilendirilmiş ağı gösterir. Proxy, VPN, Tor ve barındırma sınıflandırmaları rota veya altyapı kanıtıdır.' },
        { title: 'Görünürlüğü azaltma', body: 'Uygun olduğunda gizlilik odaklı ağ hizmetleri kullanın ve sağlayıcı ile DNS davranışını gözden geçirin.' },
      ],
      checklist: ['Ağ kanıtını fiziksel konumdan ayırın.', 'Kaynak güvenini kontrol edin.', 'Ağ yolunu değiştirdikten sonra yeniden tarayın.'],
    },
  },
  fingerprint: {
    en: {
      title: 'How browser fingerprinting works',
      intro: 'A fingerprint is created by combining browser and device characteristics. Uniqueness can increase when many stable or exposed signals line up.',
      sections: [
        { title: 'Common signals', body: 'Canvas, WebGL, audio, display, hardware, client hints, locale and other capabilities can contribute to a fingerprint. A single signal rarely proves identity by itself.' },
        { title: 'How PrivaSec treats evidence', body: 'The auditor distinguishes observed signals from score-eligible findings and avoids presenting ordinary browser diversity as a confirmed compromise.' },
        { title: 'Reducing uniqueness', body: 'Use browsers with anti-fingerprinting protections, keep configurations consistent, and disable or mask unnecessary high-entropy signals when practical.' },
      ],
      checklist: ['Look at combinations, not one signal.', 'Prefer confirmed evidence over guesses.', 'Re-scan after changing privacy settings.'],
    },
    ar: {
      title: 'كيف تعمل بصمة المتصفح؟',
      intro: 'تتكون البصمة من جمع خصائص المتصفح والجهاز. تزداد إمكانية التميّز عندما تتوافق إشارات كثيرة ثابتة أو مكشوفة.',
      sections: [
        { title: 'الإشارات الشائعة', body: 'يمكن أن تسهم Canvas وWebGL والصوت والشاشة والعتاد وClient Hints واللغة والمنطقة وغيرها في البصمة. إشارة واحدة لا تثبت الهوية عادةً.' },
        { title: 'كيف يتعامل PrivaSec مع الدليل', body: 'يفصل المدقق بين الإشارات المرصودة والنتائج المؤهلة للتأثير على الدرجة، ولا يعتبر الاختلاف الطبيعي في المتصفحات اختراقاً مؤكداً.' },
        { title: 'تقليل التفرّد', body: 'استخدم متصفحات توفر حماية من البصمة، وحافظ على إعدادات متسقة، وقلل الإشارات عالية الإنتروبيا غير الضرورية عندما يكون ذلك عملياً.' },
      ],
      checklist: ['انظر إلى مجموع الإشارات.', 'اعتمد على الدليل المؤكد.', 'أعد الفحص بعد تغيير إعدادات الخصوصية.'],
    },
  },
  webrtc: {
    en: {
      title: 'What WebRTC can reveal',
      intro: 'WebRTC can gather ICE candidates for peer connections. A candidate alone does not automatically prove a public-IP leak; correlation and evidence quality matter.',
      sections: [
        { title: 'Local vs public candidates', body: 'Local candidates can expose private network information in some environments. Public candidates are more sensitive, but interpretation depends on browser behavior and whether the address is correlated with the server-observed connection.' },
        { title: 'Why PrivaSec may show review needed', body: 'A public candidate can be observed without enough evidence to prove that the site received or used that address. The interface therefore separates observed candidates from confirmed leakage.' },
        { title: 'Reducing WebRTC exposure', body: 'Use built-in browser controls or privacy settings that restrict non-proxied UDP, and verify the result with a fresh audit after changing the policy.' },
      ],
      checklist: ['Separate candidates from confirmed leaks.', 'Review the candidate list carefully.', 'Re-scan after changing WebRTC policy.'],
    },
    ar: {
      title: 'ماذا يمكن أن يكشف WebRTC؟',
      intro: 'يمكن لـWebRTC جمع ICE candidates للاتصالات المباشرة. ظهور candidate لا يثبت تلقائياً وجود تسريب عام؛ جودة الدليل والربط بالسياق مهمان.',
      sections: [
        { title: 'العناوين المحلية والعامة', body: 'قد تكشف العناوين المحلية معلومات عن الشبكة الخاصة. أما العناوين العامة فهي أكثر حساسية، لكن تفسيرها يعتمد على سلوك المتصفح وربطها بالاتصال الذي رآه الخادم.' },
        { title: 'لماذا قد تظهر مراجعة مطلوبة', body: 'يمكن رصد عنوان عام دون دليل كافٍ على أن الموقع استلمه أو استخدمه. لذلك يفصل PrivaSec بين candidate المرصود والتسريب المؤكد.' },
        { title: 'تقليل انكشاف WebRTC', body: 'استخدم إعدادات المتصفح التي تقيد UDP غير الممرّر عبر Proxy، ثم أعد الفحص بعد تغيير السياسة للتحقق.' },
      ],
      checklist: ['فرّق بين candidate والتسريب المؤكد.', 'راجع قائمة candidates.', 'أعد الفحص بعد تغيير سياسة WebRTC.'],
    },
  },
  headers: {
    en: {
      title: 'Security & privacy headers',
      intro: 'HTTP headers can communicate security and privacy policies to browsers and intermediary systems.',
      sections: [
        { title: 'Important controls', body: 'HSTS helps enforce HTTPS. CSP constrains resource loading. Referrer-Policy limits referrer disclosure. Permissions-Policy controls selected browser capabilities. GPC and DNT can communicate privacy preferences when supported.' },
        { title: 'What PrivaSec reports', body: 'The header audit separates received headers, privacy signals and proxy metadata so that missing policy headers are not confused with application compromise.' },
        { title: 'Improving the header posture', body: 'Configure policies on the site or edge, test them against the actual deployed response, and remove obsolete or overly permissive directives.' },
      ],
      checklist: ['Verify headers on the deployed response.', 'Treat missing headers as configuration findings.', 'Re-test after changing policy.'],
    },
    ar: {
      title: 'ترويسات الأمان والخصوصية',
      intro: 'يمكن لترويسات HTTP أن تنقل سياسات الأمان والخصوصية إلى المتصفح والأنظمة الوسيطة.',
      sections: [
        { title: 'أهم عناصر الحماية', body: 'يساعد HSTS على فرض HTTPS، وCSP على تقييد تحميل الموارد، وReferrer-Policy على تقليل كشف المُحيل، وPermissions-Policy على التحكم في قدرات المتصفح.' },
        { title: 'ما الذي يعرضه PrivaSec', body: 'يفصل تدقيق الترويسات بين الترويسات المستلمة وإشارات الخصوصية وبيانات الوسيط، حتى لا يُعامل غياب سياسة ما كاختراق للتطبيق.' },
        { title: 'تحسين الترويسات', body: 'اضبط السياسات على الموقع أو طبقة الحافة، ثم اختبر الاستجابة المنشورة فعلياً وأزل القواعد القديمة أو المتساهلة أكثر من اللازم.' },
      ],
      checklist: ['تحقق من الاستجابة المنشورة فعلياً.', 'تعامل مع النقص كمسألة إعداد.', 'أعد الاختبار بعد التعديل.'],
    },
  },
  reputation: {
    en: {
      title: 'How IP reputation works',
      intro: 'IP reputation aggregates reports and classifications from external sources. It is useful evidence, but it is not an identity verdict.',
      sections: [
        { title: 'Why sources disagree', body: 'Providers use different databases, observation windows and classification methods. A recently reassigned address can inherit old reports, so source disagreement is meaningful context.' },
        { title: 'How PrivaSec presents it', body: 'Provider observations, confidence and measurement status are shown separately from confirmed privacy deductions. External intelligence should be interpreted as supporting evidence.' },
        { title: 'Practical interpretation', body: 'Look for agreement across independent sources and consider network type, hosting status and routing context before acting on a reputation label.' },
      ],
      checklist: ['Check source agreement.', 'Read confidence and measurement status.', 'Treat reputation as evidence, not certainty.'],
    },
    ar: {
      title: 'كيف تعمل سمعة IP؟',
      intro: 'تجمع سمعة IP تقارير وتصنيفات من مصادر خارجية. وهي دليل مفيد لكنها ليست حكماً على هوية المستخدم.',
      sections: [
        { title: 'لماذا تختلف المصادر', body: 'تستخدم المصادر قواعد بيانات وفترات ملاحظة وأساليب تصنيف مختلفة. وقد يحتفظ العنوان المعاد تخصيصه بتقارير قديمة.' },
        { title: 'كيف يعرضها PrivaSec', body: 'تُعرض ملاحظات المزوّدين والثقة وحالة القياس بشكل منفصل عن الخصومات المؤكدة على الخصوصية.' },
        { title: 'كيفية تفسير النتيجة', body: 'ابحث عن اتفاق بين مصادر مستقلة وراجع نوع الشبكة والاستضافة وسياق المسار قبل اتخاذ قرار بناءً على تصنيف السمعة.' },
      ],
      checklist: ['تحقق من اتفاق المصادر.', 'اقرأ الثقة وحالة القياس.', 'تعامل مع السمعة كدليل لا كحقيقة مطلقة.'],
    },
  },
};

type LearnCard = readonly [string, string, string, string, LucideIcon];

export const LearnRoute: React.FC = () => {
  const { language, t } = useLanguage();
  const { currentPath } = useRouter();
  const c = content[language] as unknown as { title: string; desc: string; intro: string; read: string; cards: readonly LearnCard[] };
  const cards = c.cards;

  const guideId = currentPath.startsWith('/learn/') ? currentPath.slice('/learn/'.length).split('/')[0] : null;
  const learningCenterLabel: Record<'en'|'ar'|'es'|'fr'|'pt'|'tr', string> = {
    en: 'Learning Center',
    ar: 'مركز التعلم',
    es: 'Centro de aprendizaje',
    fr: 'Centre d’apprentissage',
    pt: 'Centro de aprendizado',
    tr: 'Öğrenme Merkezi',
  };
  const guide = guideId
    ? (guides[guideId]?.[language] || guides[guideId]?.en || null)
    : null;

  if (guide) {
    return (
      <div className="max-w-5xl mx-auto py-8 sm:py-10 space-y-6">
        <SEOHead title={`${guide.title} | PrivaSec`} description={guide.intro} path={currentPath} />
        <div className="flex items-center justify-between gap-3">
          <Link to="/learn" className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border border-slate-800 bg-slate-900/70 text-sm text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            <span>{learningCenterLabel[language]}</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-mono">PrivaSec Guide</span>
        </div>

        <header className="rounded-3xl border border-cyan-500/20 bg-slate-900/70 p-7 sm:p-9">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-100">{guide.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{guide.intro}</p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-4">
          <div className="space-y-4">
            {guide.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
                <h2 className="text-base font-semibold text-slate-100">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">{section.body}</p>
              </section>
            ))}
          </div>
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5 h-fit">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">{t.common.recommendation}</h2>
            <div className="mt-3 space-y-3">
              {guide.checklist.map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">{t.common.learnMore}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{c.intro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 space-y-8">
      <SEOHead title={`${c.title} | PrivaSec`} description={c.desc} path="/learn" />
      <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 sm:p-10">
        <div className="flex gap-4 items-start"><div className="w-12 h-12 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-cyan-400"><BookOpen className="w-6 h-6" /></div><div><div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">{t.appTitle}</div><h1 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-100">{c.title}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{c.intro}</p></div></div>
      </header>
      <section className="grid sm:grid-cols-2 gap-4" aria-labelledby="learn-guides">
        <h2 id="learn-guides" className="sr-only">{t.ui.guides}</h2>
        {cards.map(([id, title, desc, _href, Icon]) => <article key={id} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5"><Icon className="w-5 h-5 text-cyan-400" aria-hidden="true"/><h2 className="mt-4 text-lg font-semibold text-slate-100">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p><Link to={`/learn/${id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md px-2 -mx-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-colors">{c.read}<ArrowUpRight className="w-4 h-4" aria-hidden="true"/></Link></article>)}
      </section>
    </div>
  );
};
