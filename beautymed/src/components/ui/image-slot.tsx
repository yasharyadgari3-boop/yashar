import Image from "next/image";
import type { ImageBrief } from "@/content/site";
import { studiesImage } from "@/content/presentation-media";
const ratioClass: Record<ImageBrief["ratio"], string> = { "4:5":"aspect-[4/5]", "3:2":"aspect-[3/2]", "16:9":"aspect-video", "1:1":"aspect-square" };
export function ImageSlot({brief,className="",reveal=true,sizes="(min-width: 64rem) 33vw, 100vw"}:{brief:ImageBrief;className?:string;reveal?:boolean;sizes?:string}) {
 const revealClass=reveal ? "img-reveal h-full w-full" : "h-full w-full";
 if(brief.src) return <div className={`relative overflow-hidden bg-alt ${ratioClass[brief.ratio]} ${className}`}><div className={revealClass}><Image src={brief.src} alt={brief.alt} fill sizes={sizes} className="object-cover"/></div></div>;
 const subject=`${brief.alt} ${brief.subject}`;
 const offset=/ژل|فیلر|بسته‌بندی/.test(subject) ? "left-0" : /ویال/.test(subject) ? "-left-full" : /ظرف/.test(subject) ? "-left-[300%]" : "-left-[200%]";
 return <div role="img" aria-label={brief.alt} className={`beautymed-editorial ${ratioClass[brief.ratio]} ${className}`}><div className={revealClass}><img src={studiesImage} alt="" aria-hidden="true" loading="lazy" className={offset}/></div></div>;
}
