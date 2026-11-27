export type ImageBrief = {
 subject: string;
 ratio: "4:5" | "3:2" | "16:9" | "1:1";
 alt: string;
 src?: string;
};
export const site = {
 name: "beautyMed",
 domain: "beautymed.ir",
 heroVideoSrc: null as string | null,
 heroPoster: {
  subject: "ویدیو و پوستر هیرو: نمای آهسته‌ی ماکرو یا ادیتوریال، مثل حرکت نور روی مرمر یا ابریشم، قطره‌های ژل در حرکت آهسته، یا فضای آرام و آفتابی کلینیک. بدون سوزن، سرنگ، تزریق یا چهره در حین درمان. ویدیو ۶ تا ۱۰ ثانیه، بی‌صدا و فشرده برای موبایل.",
  ratio: "16:9",
  alt: "نمایی آرام از بافت و نور، بدون ابزار پزشکی",
 } satisfies ImageBrief,
} as const;
export type HubTopic = { slug: string; title: string };
export type Hub = {
 slug: "methods" | "fillers" | "mesotherapy" | "prp" | "prf";
 title: string; navLabel: string; cardLabel: string; image: ImageBrief; topics: ReadonlyArray<HubTopic>;
};
export const hubs: ReadonlyArray<Hub> = [
 {slug:"methods",title:"روش‌های زیبایی",navLabel:"روش‌ها",cardLabel:"همه‌ی روش‌ها",image:{subject:"نمای ادیتوریال آرام از میز کار تمیز کلینیک با نور طبیعی؛ بدون ابزار تزریق.",ratio:"4:5",alt:"فضای آرام و روشن یک کلینیک"},topics:[{slug:"overview",title:"معرفی روش‌ها"},{slug:"choosing",title:"مقایسه‌ی روش‌ها"},{slug:"safety",title:"ایمنی و عوارض"}]},
 {slug:"fillers",title:"انواع فیلر",navLabel:"فیلرها",cardLabel:"فیلرهای پوستی",image:{subject:"ماکروی قطره‌ی ژل شفاف روی سطح سفید با نور نرم.",ratio:"4:5",alt:"قطره‌ی ژل شفاف روی سطح سفید"},topics:[{slug:"types",title:"دسته‌بندی فیلرها"},{slug:"hyaluronic-acid",title:"فیلرهای Hyaluronic acid"},{slug:"complications",title:"عوارض و مدیریت آن"}]},
 {slug:"mesotherapy",title:"مزوتراپی",navLabel:"مزوتراپی",cardLabel:"مزوتراپی",image:{subject:"ویال‌های شیشه‌ای بدون برچسب روی مرمر سفید، نور جانبی ملایم.",ratio:"4:5",alt:"ویال‌های شیشه‌ای بدون برچسب روی مرمر"},topics:[{slug:"what-is",title:"مزوتراپی چیست"},{slug:"ingredients",title:"ترکیبات"},{slug:"protocols",title:"پروتکل‌ها"}]},
 {slug:"prp",title:"PRP",navLabel:"PRP",cardLabel:"PRP",image:{subject:"لوله‌ی آزمایش در سانتریفیوژ، نمای نزدیک و تمیز، بدون خون‌گیری یا تزریق.",ratio:"4:5",alt:"لوله‌ی آزمایش در دستگاه سانتریفیوژ"},topics:[{slug:"what-is",title:"PRP چیست"},{slug:"preparation",title:"آماده‌سازی"},{slug:"applications",title:"کاربردها"}]},
 {slug:"prf",title:"PRF",navLabel:"PRF",cardLabel:"PRF",image:{subject:"نمای نزدیک از ظرف آزمایشگاهی شیشه‌ای با نور آفتاب ملایم.",ratio:"4:5",alt:"ظرف آزمایشگاهی شیشه‌ای در نور ملایم"},topics:[{slug:"what-is",title:"PRF چیست"},{slug:"vs-prp",title:"تفاوت PRF و PRP"},{slug:"applications",title:"کاربردها"}]},
];
export function getHub(slug:string):Hub|undefined {return hubs.find(h=>h.slug===slug);}
export type NavItem = { href:string;label:string;primary?:boolean };
export const mainNav:ReadonlyArray<NavItem> = [
 {href:"/methods",label:"روش‌ها",primary:true},{href:"/fillers",label:"فیلرها"},{href:"/mesotherapy",label:"مزوتراپی"},{href:"/prp",label:"PRP"},{href:"/prf",label:"PRF"},{href:"/training",label:"آموزش پزشکان",primary:true},{href:"/library",label:"پژوهش‌ها",primary:true},{href:"/shop",label:"فروشگاه",primary:true},
];
export const libraryTopics:ReadonlyArray<{slug:string;title:string}> = [
 {slug:"dermal-fillers",title:"فیلرهای پوستی (Dermal fillers)"},{slug:"hyaluronic-acid-fillers",title:"فیلرهای Hyaluronic acid"},{slug:"mesotherapy",title:"مزوتراپی (Mesotherapy)"},{slug:"prp",title:"Platelet-rich plasma"},{slug:"prf",title:"Platelet-rich fibrin"},{slug:"botulinum-toxin",title:"Botulinum toxin در زیبایی"},{slug:"filler-complications",title:"عوارض فیلر"},
];
export const productCategories:ReadonlyArray<{slug:string;title:string;image:ImageBrief}> = [
 {slug:"dermal-fillers",title:"فیلرهای پوستی",image:{subject:"جعبه‌ی بسته‌بندی سفید و بدون برند روی سطح سفید، نمای بالا.",ratio:"3:2",alt:"بسته‌بندی سفید بدون برند"}},
 {slug:"mesotherapy-products",title:"محصولات مزوتراپی",image:{subject:"ردیف ویال‌های شیشه‌ای بدون برچسب، نمای روبه‌رو، پس‌زمینه‌ی سفید.",ratio:"3:2",alt:"ویال‌های شیشه‌ای بدون برچسب"}},
];
