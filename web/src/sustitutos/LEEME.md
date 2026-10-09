Sustitutos de stores de la app para el build de la WEB (`web/vite.config.ts`,
plugin `sustitutosApp`). Las islas 3D de la web (la máscara y las guías)
importan piezas del avatar de `src/core/house/`, y esas piezas leen stores que,
al importarse, abren la base de datos de la app, cargan la casa y siembran la
biblioteca. En la web no hay casa: estos módulos exportan lo MISMO con el
estado de reposo (nadie montado, nadie bailando, sin efectos). La app no los ve.
