using System.Collections.Generic;
using UnityEngine;

namespace IceUltimate
{
    /// <summary>
    /// Classe base dei moduli VFX. Ogni modulo espone pochi parametri "macro"
    /// (campi float pubblici) che la clip "IceUltimate_Cast" anima nel tempo.
    /// Apply() traduce quei valori nelle proprieta' degli shader dei figli tramite
    /// MaterialPropertyBlock (nessuna copia dei materiali). [ExecuteAlways] fa si'
    /// che lo scrubbing della finestra Animation mostri l'anteprima nell'editor.
    /// </summary>
    [ExecuteAlways]
    public abstract class IceVfxModule : MonoBehaviour
    {
        protected static readonly int IdIntensity = Shader.PropertyToID("_Intensity");
        protected static readonly int IdReveal = Shader.PropertyToID("_Reveal");
        protected static readonly int IdFade = Shader.PropertyToID("_Fade");
        protected static readonly int IdSpinSpeed = Shader.PropertyToID("_SpinSpeed");
        protected static readonly int IdDissolve = Shader.PropertyToID("_Dissolve");
        protected static readonly int IdFlash = Shader.PropertyToID("_Flash");

        MaterialPropertyBlock _mpb;
        readonly Dictionary<string, Renderer> _renderers = new Dictionary<string, Renderer>();
        readonly Dictionary<string, ParticleSystem> _particles = new Dictionary<string, ParticleSystem>();

        protected Renderer R(string path)
        {
            if (!_renderers.TryGetValue(path, out var r) || r == null)
            {
                var t = transform.Find(path);
                r = t ? t.GetComponent<Renderer>() : null;
                _renderers[path] = r;
            }
            return r;
        }

        /// <summary>Imposta un float sul renderer al percorso indicato (relativo al modulo).</summary>
        protected void SetFloat(string path, int id, float value)
        {
            var r = R(path);
            if (r) SetFloat(r, id, value);
        }

        protected void SetFloat(Renderer r, int id, float value)
        {
            if (_mpb == null) _mpb = new MaterialPropertyBlock();
            r.GetPropertyBlock(_mpb);
            _mpb.SetFloat(id, value);
            r.SetPropertyBlock(_mpb);
        }

        /// <summary>Imposta l'intensita' su tutti i renderer figli diretti di `group`.</summary>
        protected void SetGroupFloat(string group, int id, float value)
        {
            var g = transform.Find(group);
            if (!g) return;
            foreach (Transform c in g)
            {
                var r = c.GetComponent<Renderer>();
                if (r) SetFloat(r, id, value);
            }
        }

        protected void SetVisible(string path, bool visible)
        {
            var t = transform.Find(path);
            if (t && t.gameObject.activeSelf != visible) t.gameObject.SetActive(visible);
        }

        /// <summary>Accende/spegne un emettitore continuo (solo in Play Mode).</summary>
        protected void SetEmitting(string path, bool on)
        {
            if (!Application.isPlaying) return;
            if (!_particles.TryGetValue(path, out var ps) || ps == null)
            {
                var t = transform.Find(path);
                ps = t ? t.GetComponent<ParticleSystem>() : null;
                _particles[path] = ps;
            }
            if (!ps) return;
            if (on && !ps.isEmitting) ps.Play(true);
            else if (!on && ps.isEmitting) ps.Stop(true, ParticleSystemStopBehavior.StopEmitting);
        }

        /// <summary>Fa ripartire tutte le particelle one-shot (non in loop) del modulo.</summary>
        public virtual void Burst()
        {
            foreach (var ps in GetComponentsInChildren<ParticleSystem>(true))
            {
                if (ps.main.loop) continue;
                ps.Clear(false);
                ps.Play(false);
            }
        }

        protected virtual void LateUpdate() => Apply();
        protected virtual void OnValidate() => Apply();

        /// <summary>Applica i parametri macro ai figli.</summary>
        public abstract void Apply();
    }
}
