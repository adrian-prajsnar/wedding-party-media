import { validateVideoDuration } from "../../shared/limits";

export function inspectVideo(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const finish = (action: () => void) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      action();
    };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      finish(() => {
        const error = validateVideoDuration(duration);
        if (error === "too_long") reject(new Error("too_long"));
        else if (error) reject(new Error("unreadable"));
        else resolve(duration);
      });
    };
    video.onerror = () => finish(() => reject(new Error("unreadable")));
    video.src = url;
  });
}
