using UnityEngine;

namespace IceUltimate
{
    /// <summary>Utility indipendenti dalla render pipeline (Built-in / URP).</summary>
    public static class IceRenderUtil
    {
        /// <summary>
        /// Le soft particles leggono la depth texture della camera. In Built-in si
        /// attiva con depthTextureMode; in URP con "requiresDepthTexture" sul
        /// componente UniversalAdditionalCameraData (via reflection, cosi' il
        /// pacchetto funziona anche senza URP installato).
        /// </summary>
        public static void EnableDepthTextureOnMainCamera()
        {
            var cam = Camera.main;
            if (!cam) return;
            cam.depthTextureMode |= DepthTextureMode.Depth;
            var urpData = cam.GetComponent("UniversalAdditionalCameraData");
            if (urpData)
            {
                var prop = urpData.GetType().GetProperty("requiresDepthTexture");
                if (prop != null && prop.CanWrite) prop.SetValue(urpData, true);
            }
        }
    }
}
