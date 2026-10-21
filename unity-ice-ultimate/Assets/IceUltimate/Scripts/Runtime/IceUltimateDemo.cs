using UnityEngine;

namespace IceUltimate
{
    /// <summary>
    /// Scena demo: rilancia l'abilita' in loop; con il pulsante a schermo
    /// (o Spazio, se e' attivo il vecchio Input Manager) la rilancia subito.
    /// </summary>
    public class IceUltimateDemo : MonoBehaviour
    {
        public IceUltimateController ultimate;
        public bool loop = true;
        public float loopDelay = 1f;
        public float clipLength = 10f;

        float _next;

        void Start() => _next = Time.time + 0.4f;

        void Update()
        {
            if (!ultimate) return;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKeyDown(KeyCode.Space)) Replay();
#endif
            if (loop && Time.time >= _next) Replay();
        }

        void Replay()
        {
            ultimate.Play();
            _next = Time.time + clipLength / Mathf.Max(ultimate.speed, 0.01f) + loopDelay;
        }

        void OnGUI()
        {
            if (GUI.Button(new Rect(16, 16, 200, 32), "Rilancia Ice Ultimate")) Replay();
        }
    }
}
