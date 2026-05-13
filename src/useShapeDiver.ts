import { useEffect, useRef, useState, useCallback } from "react";

const TICKET =
  "4b6a28f6c0b7fbe4e20fcc15efa7cdacab7b55345b344161de5573544c76080e6764973ed0597eb2532874fe980b15b02da8fafd121e4da73352f5bc777609a3cbe94c4df0c3777cbc92b61ab9958ace7a968401504293c257b539d9950f629387c4a71c4227f7-bc249e9fc3248481cc63304d657f2a97";

const MODEL_VIEW_URL =
  "https://sdr8euc1.eu-central-1.shapediver.com";

// Map of UI field keys -> ShapeDiver parameter names (French)
export const PARAM_NAMES: Record<string, string> = {
  height: "Hauteur à monter",
  diameter: "Diamètre colimaçon",
  openingType: "Type de trémie",
  rotation: "Sens de rotation",
  treadTop: "Type de marches",
  risers: "Type de contre-marches",
  handrail: "Type de main-courante",
  floorRailing: "Garde-corps étage",
  startPost: "Poteau de départ",
  endPost: "Poteau d'arrivée",
  startNewel: "Crosse au départ",
  endNewel: "Crosse à l'arrivée",
  startBall: "Boule au départ",
  endBall: "Boule à l'arrivée",
  balusters: "Balustres intermédiaires",
  treadsNoRail: "Marches sans garde-corps",
  distributionPlate: "Plaque de répartition charge",
  // Contact fields
  postalAddress: "Adresse postale",
  email: "Adresse mail*",
  name: "Nom*",
  phone: "N° de téléphone*",
  postalCity: "Code postal et ville",
  message: "Message",
};

export type ConfigState = {
  height: number;
  diameter: number;
  openingType: number;
  rotation: number;
  treadTop: number;
  risers: number;
  handrail: number;
  floorRailing: number;
  startPost: number;
  endPost: number;
  startNewel: number;
  endNewel: number;
  startBall: number;
  endBall: number;
  balusters: number;
  treadsNoRail: number;
  distributionPlate: number;
};

export const DEFAULT_CONFIG: ConfigState = {
  height: 2500,
  diameter: 1400,
  openingType: 0,
  rotation: 0,
  treadTop: 0,
  risers: 4,
  handrail: 2,
  floorRailing: 0,
  startPost: 0,
  endPost: 0,
  startNewel: 0,
  endNewel: 0,
  startBall: 0,
  endBall: 0,
  balusters: 0,
  treadsNoRail: 0,
  distributionPlate: 0,
};

export function useShapeDiver(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const sessionRef = useRef<any>(null);
  const viewportRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const viewportId = `staircase-viewport-${Date.now()}`;

    const init = async () => {
      try {
        if (!canvasRef.current) return;

        const { createViewport, createSession } = await import("@shapediver/viewer");

        // Wait for the canvas to have real pixel dimensions
        const canvas = canvasRef.current;
        await new Promise<void>(resolve => {
          const check = () => {
            if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });

        if (cancelled) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const viewport = await createViewport({
          canvas,
          id: viewportId,
        });

        // 2. Create session (loads the model)
        const session = await createSession({
          ticket: TICKET,
          modelViewUrl: MODEL_VIEW_URL,
          id: "staircase-session",
        });

        if (cancelled) {
          viewport.close();
          session.close();
          return;
        }

        viewportRef.current = viewport;
        sessionRef.current = session;
        // Log all params so we can verify names and types
        const allParams = Object.values(session.parameters as Record<string, any>) as any[];
        console.log("[ShapeDiver] StringList choices:", allParams.filter(p => p.type === "StringList").map(p => ({ name: p.name, choices: p.choices })));
        console.log("[ShapeDiver] all parameters:", allParams.map(p => ({ name: p.name, type: p.type, value: p.value })));
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "ShapeDiver init failed");
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateParam = useCallback(async (key: string, value: unknown) => {
    if (!sessionRef.current) return;
    const paramName = PARAM_NAMES[key];
    if (!paramName) return;

    // Find the parameter by name in the session
    const params = sessionRef.current.parameters;
    const param = Object.values(params as Record<string, any>).find(
      (p: any) => p.name === paramName
    );
    if (!param) {
      console.warn(`[ShapeDiver] param not found: "${paramName}"`);
      return;
    }

    // Coerce value to the correct type based on the parameter's type
    let coerced: unknown = value;
    const ptype = (param.type ?? "").toLowerCase();
    if (ptype === "bool" || ptype === "boolean") {
      coerced = Boolean(value);
    } else if (ptype === "stringlist" || ptype === "string") {
      coerced = String(value);
    } else {
      // Int / Float — keep as number
      coerced = Number(value);
    }

    console.log(`[ShapeDiver] set "${paramName}" (${param.type}) =`, coerced);

    try {
      param.value = coerced;
      await sessionRef.current.customize();
    } catch (e) {
      console.error(`[ShapeDiver] customize failed for "${paramName}":`, e);
    }
  }, []);

  const submitContact = useCallback(async (contactData: Record<string, string>) => {
    if (!sessionRef.current) return;
    const params = sessionRef.current.parameters;

    for (const [key, val] of Object.entries(contactData)) {
      const paramName = PARAM_NAMES[key];
      if (!paramName) continue;
      const param = Object.values(params as Record<string, any>).find(
        (p: any) => p.name === paramName
      );
      if (param) param.value = val;
    }

    try {
      await sessionRef.current.customize();
      // Trigger send flag
      const sendParam = Object.values(params as Record<string, any>).find(
        (p: any) => p.name === "Envoi de la demande pour être recontacté"
      );
      if (sendParam) {
        sendParam.value = true;
        await sessionRef.current.customize();
      }
    } catch (_) {}
  }, []);

  const zoomIn = useCallback(() => {
    const cam = viewportRef.current?.camera;
    if (cam) { cam.zoomTo(undefined, 0.7); }
  }, []);

  const zoomOut = useCallback(() => {
    const cam = viewportRef.current?.camera;
    if (cam) { cam.zoomTo(undefined, 1.4); }
  }, []);

  const resetCamera = useCallback(() => {
    const cam = viewportRef.current?.camera;
    if (cam) { cam.reset({}); }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen();
    }
  }, []);

  const getScreenshot = useCallback(() => {
    if (!viewportRef.current) return;
    const dataUrl = viewportRef.current.getScreenshot("image/png", 1);
    const link = document.createElement("a");
    link.download = "escalier-colimacon.png";
    link.href = dataUrl;
    link.click();
  }, []);

  return { ready, error, updateParam, submitContact, zoomIn, zoomOut, resetCamera, toggleFullscreen, getScreenshot };
}
