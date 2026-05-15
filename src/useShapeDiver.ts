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
  stairRotation: "Rotation escalier",
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
  stairRotation: number;
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
  stairRotation: 7.09,
  balusters: 0,
  treadsNoRail: 0,
  distributionPlate: 0,
};

// Choices for StringList parameters, keyed by our config key
export type ParamChoices = Record<string, { label: string; value: string }[]>;

export function useShapeDiver(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const sessionRef = useRef<any>(null);
  const viewportRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paramChoices, setParamChoices] = useState<ParamChoices>({});

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
        // Extract parameter choices from the model
        const allParams = Object.values(session.parameters as Record<string, any>) as any[];
        console.log("[ShapeDiver] all parameters:", allParams.map(p => ({ name: p.name, type: p.type, value: p.value, choices: p.choices })));

        // Build choices map: our config key -> array of {label, value}
        const reverseMap: Record<string, string> = {};
        for (const [key, name] of Object.entries(PARAM_NAMES)) {
          reverseMap[name] = key;
        }
        const choices: ParamChoices = {};
        for (const p of allParams) {
          const key = reverseMap[p.name];
          if (key && p.choices) {
            choices[key] = p.choices.map((label: string, idx: number) => ({
              label,
              value: String(idx),
            }));
          }
        }
        setParamChoices(choices);

        // Create orthographic cameras for preset views
        try {
          const { ORTHOGRAPHIC_CAMERA_DIRECTION } = await import("@shapediver/viewer");
          // Remember default perspective camera
          const cam = viewport.camera;
          defaultCameraIdRef.current = cam ? (cam as any).id || Object.keys(viewport.cameras)[0] : "";

          const dirMap: Record<string, any> = {
            top: ORTHOGRAPHIC_CAMERA_DIRECTION.TOP,
            left: ORTHOGRAPHIC_CAMERA_DIRECTION.LEFT,
            right: ORTHOGRAPHIC_CAMERA_DIRECTION.RIGHT,
            front: ORTHOGRAPHIC_CAMERA_DIRECTION.FRONT,
            back: ORTHOGRAPHIC_CAMERA_DIRECTION.BACK,
          };
          const existingCameras = viewport.cameras || {};
          for (const [dir, enumVal] of Object.entries(dirMap)) {
            if (existingCameras[dir]) {
              // Camera already exists, just reference it
              orthoCamerasRef.current[dir] = dir;
            } else {
              try {
                const ortho = viewport.createOrthographicCamera(dir);
                ortho.direction = enumVal;
                orthoCamerasRef.current[dir] = dir;
              } catch (camErr) {
                console.warn(`[ShapeDiver] ortho camera "${dir}" already exists, reusing`);
                orthoCamerasRef.current[dir] = dir;
              }
            }
          }
          console.log("[ShapeDiver] ortho cameras ready, default:", defaultCameraIdRef.current);
        } catch (camErr) {
          console.warn("[ShapeDiver] Failed to create orthographic cameras:", camErr);
        }

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
    const session = sessionRef.current;
    const params = session.parameters;
    const allParams = Object.values(params as Record<string, any>) as any[];

    console.log("[ShapeDiver] Contact submit — setting fields...");

    // Step 1: Activate the contact step
    const stepParam = allParams.find((p: any) => p.name === "Passer \u00E0 l'\u00E9tape suivante");
    if (stepParam) {
      console.log("[ShapeDiver] Contact: setting 'Passer à l'étape suivante' = true");
      stepParam.value = true;
    }

    // Step 2: Set the send trigger boolean
    const sendParam = allParams.find((p: any) => p.name === "Envoi de la demande pour \u00EAtre recontact\u00E9");
    if (sendParam) {
      console.log("[ShapeDiver] Contact: setting send trigger = true");
      sendParam.value = true;
    }

    // Step 3: Set all contact field values
    for (const [key, val] of Object.entries(contactData)) {
      const paramName = PARAM_NAMES[key];
      if (!paramName) continue;
      const param = allParams.find((p: any) => p.name === paramName);
      if (param) {
        console.log(`[ShapeDiver] Contact: setting "${paramName}" = "${val}"`);
        param.value = val;
      } else {
        console.warn(`[ShapeDiver] Contact: param not found: "${paramName}"`);
      }
    }

    try {
      // Step 4: Customize with all values set (including send trigger)
      await session.customize();
      console.log("[ShapeDiver] Contact: customize — OK");

      // Step 5: Request the email export
      const exports = session.exports;
      const allExports = Object.values(exports as Record<string, any>) as any[];
      console.log("[ShapeDiver] Contact: exports available:", allExports.map((e: any) => ({ name: e.name, type: e.type, id: e.id })));

      const emailExport = allExports.find((e: any) => e.name === "Envoi Mail" || e.type === "email");
      if (emailExport) {
        console.log(`[ShapeDiver] Contact: requesting email export "${emailExport.name}" (id: ${emailExport.id})`);
        const result = await emailExport.request();
        console.log("[ShapeDiver] Contact: email export result:", result);
      } else {
        console.warn("[ShapeDiver] Contact: NO email export found! Exports:", allExports.map((e: any) => e.name));
      }
    } catch (e) {
      console.error("[ShapeDiver] Contact submit error:", e);
    }
  }, []);

  const zoomCamera = useCallback((factor: number) => {
    const cam = viewportRef.current?.camera;
    if (!cam) return;
    const pos = cam.position;
    const tgt = cam.target;
    // Move camera position closer/further from target
    const dir = [pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]];
    cam.position = [
      tgt[0] + dir[0] * factor,
      tgt[1] + dir[1] * factor,
      tgt[2] + dir[2] * factor,
    ];
  }, []);

  const zoomIn = useCallback(() => zoomCamera(0.8), [zoomCamera]);
  const zoomOut = useCallback(() => zoomCamera(1.25), [zoomCamera]);

  const resetCamera = useCallback(() => {
    const cam = viewportRef.current?.camera;
    if (!cam) return;
    cam.position = cam.defaultPosition;
    cam.target = cam.defaultTarget;
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

  // Camera preset views — use ShapeDiver's built-in orthographic cameras
  type CameraPreset = "perspective" | "top" | "left" | "right" | "front" | "back";
  const orthoCamerasRef = useRef<Record<string, string>>({});
  const defaultCameraIdRef = useRef<string>("");
  const setCameraView = useCallback((preset: CameraPreset) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (preset === "perspective") {
      if (defaultCameraIdRef.current) {
        viewport.assignCamera(defaultCameraIdRef.current);
      }
      return;
    }

    // Assign the orthographic camera for this direction
    const camId = orthoCamerasRef.current[preset];
    if (camId) {
      viewport.assignCamera(camId);
    }
  }, []);

  // AR mode — uses ShapeDiver's built-in AR support
  const startAR = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // On mobile devices that support AR, launch directly
    if (viewport.viewableInAR && viewport.viewableInAR()) {
      try {
        await viewport.viewInAR();
        return;
      } catch (e) {
        console.warn("[ShapeDiver] viewInAR() failed:", e);
      }
    }

    // On desktop or unsupported mobile: show QR code dialog
    if (viewport.createArSessionLink) {
      try {
        const qrDataUrl = await viewport.createArSessionLink(undefined, true);
        // Show QR code in a modal dialog
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7)";
        const dialog = document.createElement("div");
        dialog.style.cssText = "background:#2a2a2a;color:#fff;border-radius:12px;padding:32px;max-width:420px;width:90%;text-align:center;position:relative;font-family:sans-serif";
        dialog.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <span style="font-size:1.15rem;font-weight:500">Scan the code</span>
            <button id="ar-close" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:4px 8px">&times;</button>
          </div>
          <p style="margin-bottom:20px;color:#ccc;font-size:0.95rem;line-height:1.5">Scan the QR code below using your mobile device to see the model in AR. The code is compatible with Android and iOS devices.</p>
          <img src="${qrDataUrl}" alt="QR Code AR" style="width:200px;height:200px;margin:0 auto;display:block;background:#fff;padding:12px;border-radius:8px" />
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        dialog.querySelector("#ar-close")!.addEventListener("click", close);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
        return;
      } catch (e) {
        console.warn("[ShapeDiver] createArSessionLink() failed:", e);
      }
    }

    alert("La réalité augmentée n'est pas disponible sur cet appareil. Essayez depuis un smartphone ou une tablette compatible.");
  }, []);

  return { ready, error, paramChoices, updateParam, submitContact, zoomIn, zoomOut, resetCamera, toggleFullscreen, getScreenshot, setCameraView, startAR };
}
