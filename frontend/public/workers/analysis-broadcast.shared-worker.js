const ports = [];
let currentStatus = { status: "idle", stage: null };

self.onconnect = function (event) {
  const port = event.ports[0];
  ports.push(port);

  // Al conectar, le mandamos el estado actual (por si el análisis ya estaba corriendo)
  port.postMessage({ type: "STATE", payload: currentStatus });

  port.onmessage = function (e) {
    if (e.data.type === "UPDATE_STATE") {
      currentStatus = e.data.payload;
      // Reenviamos el nuevo estado a TODAS las pestañas conectadas, incluida la que lo originó
      ports.forEach((p) => p.postMessage({ type: "STATE", payload: currentStatus }));
    }
  };
};