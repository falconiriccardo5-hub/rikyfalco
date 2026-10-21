using System.Globalization;
using UnityEngine;
using UnityEngine.Events;

namespace IceUltimate
{
    /// <summary>
    /// Orchestratore dell'abilita'. Posiziona il prefab SUL BERSAGLIO e imposta
    /// casterOffset (posizione di chi lancia, in coordinate locali).
    /// La coreografia e' nella clip "IceUltimate_Cast" (Animator, stato "Cast"):
    /// curve sui parametri dei moduli + Animation Event per particelle,
    /// camera shake, zoom, post-process e segnali.
    /// </summary>
    [ExecuteAlways]
    [RequireComponent(typeof(Animator))]
    public class IceUltimateController : MonoBehaviour
    {
        public Vector3 casterOffset = new Vector3(2.6f, 0f, -5f);
        [Tooltip("Avvia l'effetto quando l'oggetto viene attivato/istanziato")]
        public bool playOnEnable = true;
        [Range(0.1f, 3f)] public float speed = 1f;
        [Tooltip("Animator del personaggio che lancia (opzionale): riceve lo stato \"Cast\"")]
        public Animator casterAnimator;

        public UnityEvent onImpact = new UnityEvent();
        public UnityEvent onDetonated = new UnityEvent();
        public UnityEvent onFinished = new UnityEvent();

        Animator _animator;

        void OnEnable()
        {
            _animator = GetComponent<Animator>();
            Layout();
            if (Application.isPlaying)
            {
                IceRenderUtil.EnableDepthTextureOnMainCamera();
                if (playOnEnable) Play();
            }
        }

        void OnValidate() => Layout();

        /// <summary>Avvia (o riavvia) l'abilita' dall'inizio.</summary>
        public void Play()
        {
            if (!_animator) _animator = GetComponent<Animator>();
            _animator.speed = speed;
            _animator.Play("Cast", 0, 0f);
            if (casterAnimator) casterAnimator.Play("Cast", 0, 0f);
        }

        void Layout()
        {
            var cf = transform.Find("CastFrost");
            if (cf) cf.localPosition = casterOffset;
            var orb = transform.Find("IceOrb");
            if (orb && orb.TryGetComponent<IceOrb>(out var o))
                o.startPoint = casterOffset + new Vector3(-0.3f, 1.5f, 0.4f);
        }

        // ---- Animation Event (chiamati dalla clip "IceUltimate_Cast") ----------

        /// <summary>Fa ripartire le particelle one-shot del modulo (nome del figlio).</summary>
        public void EvtBurst(string module)
        {
            var t = transform.Find(module);
            if (t && t.TryGetComponent<IceVfxModule>(out var m)) m.Burst();
        }

        /// <summary>"forza,durata" -> camera shake.</summary>
        public void EvtShake(string args)
        {
            var a = ParseArgs(args, 2);
            CameraShake.ShakeAll(a[0], a[1]);
        }

        /// <summary>"gradi,durata" -> zoom d'impatto (FOV).</summary>
        public void EvtPunch(string args)
        {
            var a = ParseArgs(args, 2);
            CameraShake.PunchAll(a[0], a[1]);
        }

        /// <summary>"chroma,blur,flash,durata" -> impulso di post-process.</summary>
        public void EvtPost(string args)
        {
            var a = ParseArgs(args, 4);
            IcePostFX.PulseAll(a[0], a[1], a[2], a[3]);
        }

        /// <summary>"impact" | "detonated" | "finished".</summary>
        public void EvtSignal(string name)
        {
            switch (name)
            {
                case "impact": onImpact.Invoke(); break;
                case "detonated": onDetonated.Invoke(); break;
                case "finished": onFinished.Invoke(); break;
            }
        }

        static float[] ParseArgs(string s, int count)
        {
            var result = new float[count];
            var parts = (s ?? "").Split(',');
            for (int i = 0; i < count && i < parts.Length; i++)
                float.TryParse(parts[i].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out result[i]);
            return result;
        }
    }
}
