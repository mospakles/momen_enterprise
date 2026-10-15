"use client";

// The landing experience, top to bottom. Heavy below-the-fold sections are
// split into their own chunks and load as the visitor approaches them.

import dynamic from "next/dynamic";
import { useState } from "react";
import Intro, { useIntroSeen } from "./Intro";
import Hero from "./Hero";
import { SmoothScroll } from "@/lib/motion/SmoothScroll";
import { CustomCursor } from "@/lib/motion/CustomCursor";
import { Grain } from "@/lib/motion/Grain";

const Story = dynamic(() => import("./Story"));
const Craft = dynamic(() => import("./Craft"));
const Lookbook = dynamic(() => import("./Lookbook"));
const Occasions = dynamic(() => import("./Occasions"));
const Bespoke = dynamic(() => import("./Bespoke"));
const ShopHandoff = dynamic(() => import("./ShopHandoff"));

export default function Journey() {
  const seen = useIntroSeen();
  const [played, setPlayed] = useState(false);
  const ready = seen || played;

  return (
    <>
      {!seen && !played && <Intro onDone={() => setPlayed(true)} />}
      <SmoothScroll />
      <CustomCursor />
      <Grain />
      <Hero play={ready} />
      <Story />
      <Craft />
      <Lookbook />
      <Occasions />
      <Bespoke />
      <ShopHandoff />
    </>
  );
}
