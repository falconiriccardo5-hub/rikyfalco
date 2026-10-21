// Scia su mesh modellate in Blender (nastri a spirale, mezzelune).
// UV.x = lungo la scia (0 coda .. 1 punta), UV.y = attraverso.
// _Progress sposta la testa; con _AutoSpeed != 0 scorre in loop da sola.
Shader "IceUltimate/Trail"
{
    Properties
    {
        _NoiseTex ("Noise", 2D) = "gray" {}
        [HDR] _Color ("Color", Color) = (0.85, 0.93, 1, 1)
        _Intensity ("Intensity", Range(0, 30)) = 3
        _Progress ("Progress", Range(0, 2)) = 1
        _TrailLength ("Trail Length", Range(0.01, 1.5)) = 0.6
        _AutoSpeed ("Auto Speed", Float) = 0
        _EdgePower ("Edge Power", Range(0.1, 8)) = 1.5
        _StreakScale ("Streak Scale", Float) = 3
        _StreakSpeed ("Streak Speed", Float) = 1.5
        _StreakAmount ("Streak Amount", Range(0, 1)) = 0.6
        _RimBoost ("Rim Boost", Range(0, 6)) = 1.5
        _Fade ("Fade", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        Blend One One
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "IceCommon.cginc"

            sampler2D _NoiseTex;
            float4 _Color;
            float _Intensity, _Progress, _TrailLength, _AutoSpeed, _EdgePower, _StreakScale, _StreakSpeed, _StreakAmount, _RimBoost, _Fade;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                clip(_Intensity * _Fade - 1e-4);
                float u = saturate(i.uv.x);
                float v = saturate(i.uv.y);
                float head = _AutoSpeed != 0.0 ? frac(_Time.y * _AutoSpeed) * (1.0 + _TrailLength) : _Progress;
                float tail = head - _TrailLength;
                float along = saturate((u - tail) / max(_TrailLength, 1e-3));
                float m = step(tail, u) * (1.0 - smoothstep(head - 0.03, head, u)) * smoothstep(0.0, 0.35, along);
                float across = max(1.0 - abs(v * 2.0 - 1.0), 0.0);
                float edge = pow(across + 1e-4, _EdgePower);
                float rim = pow(v, 6.0) * _RimBoost;
                float n = tex2D(_NoiseTex, float2(u * _StreakScale - _Time.y * _StreakSpeed, v * 0.35)).r;
                float streak = lerp(1.0, smoothstep(0.35, 0.75, n) * 1.6, _StreakAmount);
                float bright = lerp(0.35, 1.3, along * along);
                float3 c = _Color.rgb * _Intensity * m * bright * (edge * streak + rim * along);
                return float4(clamp(c * _Fade * _Color.a, 0.0, 64.0), 0);
            }
            ENDCG
        }
    }
}
