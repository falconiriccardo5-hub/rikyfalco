// Variante senza rifrazione, per le schegge piccole (niente copia dello schermo).
shader_type canvas_item;
render_mode unshaded;

#define NO_REFRACTION
#include "ice_crystal_body.gdshaderinc"
