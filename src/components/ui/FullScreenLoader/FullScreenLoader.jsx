import { useEffect } from "react";
import SkilledProzLoader from "../SkilledProzLoader";
import styles from "./FullScreenLoader.module.css";

export default function FullScreenLoader({
  onLoadComplete,
  minLoadTime = 1500,
}) {
  useEffect(() => {
    // Optional: trigger after minimum load time
    const timer = setTimeout(() => {
      if (onLoadComplete) onLoadComplete();
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [onLoadComplete, minLoadTime]);

  return (
    <div className={styles.fullScreen}>
      <SkilledProzLoader />
    </div>
  );
}
