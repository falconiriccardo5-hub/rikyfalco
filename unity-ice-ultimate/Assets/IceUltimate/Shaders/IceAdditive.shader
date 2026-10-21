// Sprite e particelle additive (fumo, scintille, flare, fiocchi...).
// - Particelle: abilita i custom vertex stream UV, UV2, AnimBlend nel
//   Particle System Renderer per il flipbook con fusione tra frame.
// - Quad statici: _Billboard = 1 li orienta verso la camera.
// - _SoftFade > 0: soft particles (richiede la depth texture della camera).
Shader "IceUltimate/Additive"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        [HDR] _Color ("Color", Color) = (0.8, 0.88, 0.97, 1)
        _Intensity ("Intensity", Range(0, 20)) = 2
        [Toggle] _Billboard ("Billboard (quad statici)", Float) = 0
        _Spin ("Spin (rad/s)", Float) = 0
        _SoftFade ("Soft Particles Distance", Range(0, 4)) = 0
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
            #pragma multi_compile_instancing
            #include "IceCommon.cginc"

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;
            float _Intensity;
            float _Billboard;
            float _Spin;
            float _SoftFade;
            UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture);

            struct appdata
            {
                float4 vertex : POSITION;
                float4 color : COLOR;
                float4 uv : TEXCOORD0;      // xy = frame corrente, zw = frame successivo
                float animBlend : TEXCOORD1; // fusione tra i due frame
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float4 color : COLOR;
                float4 uv : TEXCOORD0;
                float blend : TEXCOORD1;
                float4 projPos : TEXCOORD2;
            };

            v2f vert(appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                if (_Billboard > 0.5)
                    o.pos = IceBillboardClipPos(v.vertex, _Time.y * _Spin);
                else
                    o.pos = UnityObjectToClipPos(v.vertex);
                o.color = v.color;
                o.uv = float4(TRANSFORM_TEX(v.uv.xy, _MainTex), TRANSFORM_TEX(v.uv.zw, _MainTex));
                o.blend = v.animBlend;
                o.projPos = ComputeScreenPos(o.pos);
                COMPUTE_EYEDEPTH(o.projPos.z);
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                float4 tex = tex2D(_MainTex, i.uv.xy);
                if (i.blend > 0.0)
                    tex = lerp(tex, tex2D(_MainTex, i.uv.zw), i.blend);
                float a = tex.a * _Color.a * i.color.a;
                if (_SoftFade > 0.0)
                {
                    float sceneZ = LinearEyeDepth(SAMPLE_DEPTH_TEXTURE_PROJ(_CameraDepthTexture, UNITY_PROJ_COORD(i.projPos)));
                    a *= saturate((sceneZ - i.projPos.z) / _SoftFade);
                }
                float3 col = tex.rgb * _Color.rgb * i.color.rgb * _Intensity * a;
                return float4(col, 0);
            }
            ENDCG
        }
    }
}
