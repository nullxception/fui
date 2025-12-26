import { Footer } from "@/components/Footer";
import { motion, type HTMLMotionProps } from "motion/react";
import BackgroundSetting from "./BackgroundSetting";
import { PromptAttachmentEditor } from "./PromptAttachment";
import { SliderSettings } from "./SliderSettings";
import TagSuggestionSettings from "./TagSuggestionSettings";

export function Settings({ ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div className="container mx-auto max-w-screen-2xl" {...props}>
      <div className="grid grid-flow-row grid-cols-1 gap-2 p-4 md:grid-cols-2 md:flex-row">
        <BackgroundSetting />
        <SliderSettings />
        <TagSuggestionSettings />
        <PromptAttachmentEditor />
      </div>
      <Footer />
    </motion.div>
  );
}
