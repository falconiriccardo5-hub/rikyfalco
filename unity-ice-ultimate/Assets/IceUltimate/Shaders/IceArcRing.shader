// Arco luminoso procedurale (coordinate polari su un Quad).
// Scie a spirale, anelli dei satelliti, "loop" della detonazione.
Shader "IceUltimate/ArcRing"
{
    Properties
    {
        [HDR] _Color ("Color", Color) = (0.8, 0.92, 1, 1)
        _Intensity ("Intensity", Range(0, 30)) = 4
        _Radius ("Radius", Range(0, 0.5)) = 0.4
        _Thickness ("Thickness", Range(0.001, 0.3)) = 0.03
        _ArcLength ("Arc Length (giri)", Range(0, 1)) = 0.35
        _ArcOffset ("Arc Offset (giri)", Float) = 0
        _SpinSpeed ("Spin Speed (giri/s)", Float) = 0
        _TailFade ("Tail Fade", Range(0, 1)) = 0.85
        _Glow ("Glow", Range(0, 4)) = 1.2
        [Toggle] _Billboard ("Billboard", Float) = 0
        _ChromaFringe ("Chroma Fringe", Range(0, 0.05)) = 0
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" "PreviewType" = "Plane" }
        Blend One One
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "IceCommon.cginc"

            float4 _Color;
            float _Intensity, _Radius, _Thickness, _ArcLength, _ArcOffset, _SpinSpeed, _TailFade, _Glow, _Billboard, _ChromaFringe;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = _Billboard > 0.5 ? IceBillboardClipPos(v.vertex, 0) : UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            float ArcMask(float2 p, float rOff)
            {
                float r = length(p);
                float ang = atan2(p.y, p.x) / 6.2831853 + 0.5;
                float start = frac(_ArcOffset + _Time.y * _SpinSpeed);
                float t = frac(ang - start);
                float inside = step(t, _ArcLength);
                float along = saturate(t / max(_ArcLength, 1e-4));
                float tail = lerp(1.0, along, _TailFade);
                float taper = lerp(0.35, 1.0, along);
                float d = abs(r - _Radius - rOff);
                float th = _Thickness * taper;
                float core = smoothstep(th, 0.0, d);
                float halo = exp(-d / (th * 2.5 + 1e-4)) * 0.6 * _Glow;
                return (core + halo) * tail * inside;
            }

            float4 frag(v2f i) : SV_Target
            {
                float2 p = i.uv - 0.5;
                float3 col;
                if (_ChromaFringe > 0.0)
                    col = float3(ArcMask(p, _ChromaFringe), ArcMask(p, 0.0), ArcMask(p, -_ChromaFringe));
                else
                    col = ArcMask(p, 0.0).xxx;
                return float4(col * _Color.rgb * _Intensity * _Color.a, 0);
            }
            ENDCG
        }
    }
}
