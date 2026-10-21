using System.Collections.Generic;
using UnityEngine;

namespace IceUltimate
{
    /// <summary>
    /// Impulsi di post-process negli istanti chiave (impatto, detonazione):
    /// - flash bianco a schermo intero (IMGUI: funziona in ogni pipeline);
    /// - "impact volume": un Volume URP (aberrazione cromatica forte, lens
    ///   distortion, bloom extra) di cui viene animato il peso. Il Volume e'
    ///   cercato via reflection, quindi senza URP lo script funziona lo stesso.
    /// </summary>
    public class IcePostFX : MonoBehaviour
    {
        [Tooltip("GameObject con il Volume URP \"di impatto\" (peso 0 a riposo)")]
        public GameObject impactVolume;
        public Color flashColor = new Color(0.9f, 0.96f, 1f, 1f);

        static readonly List<IcePostFX> All = new List<IcePostFX>();

        Component _volume;
        System.Reflection.FieldInfo _weightField;
        float _chroma, _flash, _duration = 1f, _time = 999f;

        public static void PulseAll(float chroma, float blur, float flash, float duration)
        {
            foreach (var p in All) p.Pulse(chroma, blur, flash, duration);
        }

        void OnEnable()
        {
            All.Add(this);
            if (impactVolume)
            {
                _volume = impactVolume.GetComponent("Volume");
                if (_volume) _weightField = _volume.GetType().GetField("weight");
                SetWeight(0f);
            }
        }

        void OnDisable() => All.Remove(this);

        /// <summary>chroma/blur pilotano il peso del Volume d'impatto, flash il bianco a schermo.</summary>
        public void Pulse(float chroma, float blur, float flash, float duration)
        {
            _chroma = Mathf.Clamp01(Mathf.Max(chroma, blur) / 2f);
            _flash = flash;
            _duration = Mathf.Max(duration, 0.05f);
            _time = 0f;
        }

        void Update()
        {
            _time += Time.deltaTime;
            float x = Mathf.Clamp01(_time / _duration);
            SetWeight(_chroma * Mathf.Pow(1f - x, 3f));
        }

        void SetWeight(float w)
        {
            if (_volume && _weightField != null) _weightField.SetValue(_volume, w);
        }

        void OnGUI()
        {
            float x = Mathf.Clamp01(_time / (_duration * 0.5f));
            float a = _flash * Mathf.Pow(1f - x, 3f);
            if (a <= 0.001f || Event.current.type != EventType.Repaint) return;
            var c = flashColor;
            c.a = Mathf.Clamp01(a * 0.6f);
            GUI.color = c;
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }
    }
}
