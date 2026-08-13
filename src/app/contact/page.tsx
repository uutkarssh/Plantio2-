"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, Leaf } from "lucide-react";
import { StickerCard, SectionHeader } from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";

export default function ContactPage() {
  const { t } = useI18n();

  return (
    <main className="plantio-grain flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        bg="forest"
        title={<span className="plantio-embossed">Contact Plantio</span>}
        subtitle="Questions, feedback, demos or founder enquiries"
        icon={Leaf}
        iconTint="bg-leaf"
      />

      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <StickerCard className="bg-leaf">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-forest border-[3px] border-ink flex items-center justify-center shadow-[3px_3px_0px_0px_#161611]">
                <Mail className="w-7 h-7 text-leaf" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold uppercase">Get in touch</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  Contact Utkarsh Maurya for Plantio demos, feedback, collaboration or founder enquiries.
                </p>

                <div className="mt-4 space-y-3">
                  <a
                    href="mailto:utkarshmaurya917027@gmail.com"
                    className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-white px-4 py-3 font-display text-sm font-bold shadow-[3px_3px_0px_0px_#161611] break-all"
                  >
                    <Mail className="w-5 h-5 shrink-0 text-forest" strokeWidth={2.5} />
                    utkarshmaurya917027@gmail.com
                  </a>

                  <a
                    href="mailto:utkarshmaurya88409@gmail.com"
                    className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-white px-4 py-3 font-display text-sm font-bold shadow-[3px_3px_0px_0px_#161611] break-all"
                  >
                    <Mail className="w-5 h-5 shrink-0 text-forest" strokeWidth={2.5} />
                    utkarshmaurya88409@gmail.com
                  </a>

                  <a
                    href="tel:+919170271488"
                    className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-white px-4 py-3 font-display text-sm font-bold shadow-[3px_3px_0px_0px_#161611]"
                  >
                    <Phone className="w-5 h-5 shrink-0 text-forest" strokeWidth={2.5} />
                    +91 9170271488
                  </a>
                </div>
              </div>
            </div>
          </StickerCard>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-white px-4 py-2 font-display text-sm font-bold uppercase shadow-[3px_3px_0px_0px_#161611]"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Back to About
          </Link>
        </div>
      </section>
    </main>
  );
}
