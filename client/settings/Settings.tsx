import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Header";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import BackgroundSetting from "./BackgroundSetting";
import { PromptAttachmentEditor } from "./PromptAttachment";
import SliderSettings from "./SliderSettings";

const Settings = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  (props, ref) => {
    return (
      <motion.div
        ref={ref}
        className="container mx-auto max-w-screen-2xl"
        {...props}
      >
        <div className="flex w-full p-4 md:hidden">
          <Logo />
        </div>
        <div className="grid grid-flow-row grid-cols-1 gap-2 p-4 md:grid-cols-2 md:flex-row">
          <BackgroundSetting />
          <SliderSettings />
          <PromptAttachmentEditor />
        </div>
        <Footer />
      </motion.div>
    );
  },
);

export default Settings;
