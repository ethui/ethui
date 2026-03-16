import {
  getRouterContext,
  Outlet,
  useMatch,
  useMatches,
} from "@tanstack/react-router";
import {
  AnimatePresence,
  cubicBezier,
  motion,
  useIsPresent,
} from "motion/react";
import { forwardRef, useContext, useRef } from "react";

const exit = { opacity: 0.0, scale: 0.99 };

const transitionProps = {
  initial: exit,
  animate: { opacity: 1, scale: 1 },
  exit,
  transition: {
    duration: 0.2,
    ease: cubicBezier(0.6, 0.05, -0.01, 0.9),
  },
};

export const AnimatedOutlet = forwardRef<HTMLDivElement>((_, ref) => {
  const RouterContext = getRouterContext();
  const routerContext = useContext(RouterContext);
  const renderedContext = useRef(routerContext);
  const isPresent = useIsPresent();

  const matches = useMatches();
  const match = useMatch({ strict: false });
  const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1;
  const nextMatch = matches[nextMatchIndex];

  if (isPresent) {
    renderedContext.current = routerContext;
  }

  return (
    <motion.div
      className="h-full w-full"
      ref={ref}
      {...transitionProps}
      key={nextMatch?.id}
    >
      <AnimatePresence mode="popLayout">
        <RouterContext.Provider value={renderedContext.current}>
          <Outlet />
        </RouterContext.Provider>
      </AnimatePresence>
    </motion.div>
  );
});
