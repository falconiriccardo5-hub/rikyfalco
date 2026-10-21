using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 6: detonazione (flash, onda di gelo, cupola d'urto, loop luminosi, detriti).</summary>
    public class Detonation : IceVfxModule
    {
        [Range(0, 2)] public float flash;
        [Range(0, 1)] public float progress;
        [Range(0, 1)] public float fade = 1f;

        public override void Apply()
        {
            SetFloat("Flash", IdIntensity, flash * 2.5f);
            SetFloat("Glow", IdIntensity, flash * 1f);
            SetFloat("Anamorphic", IdIntensity, flash * 2f);
            SetFloat("FrostWave", IdReveal, progress * 1.05f);
            SetFloat("FrostWave", IdFade, fade);
            var dome = transform.Find("Dome");
            if (dome)
            {
                dome.localScale = new Vector3(1f, 0.7f, 1f) * Mathf.Lerp(1f, 9f, progress);
                bool on = progress > 0.001f && progress < 0.999f;
                SetFloat("Dome", IdIntensity, on ? 1.6f * (1f - progress) * fade : 0f);
            }
            var loops = transform.Find("Loops");
            if (loops) loops.localScale = Vector3.one * Mathf.Lerp(0.5f, 1.6f, progress);
            SetGroupFloat("Loops", IdIntensity, flash * 5f);
        }
    }
}
