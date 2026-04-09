(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXI18nEs = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    return {
        app: {
            title: 'Validador de paquetes eXeLearning',
            heading: 'Validador de paquetes eXeLearning',
            subtitleHtml: 'Valida la estructura de tus proyectos <code>.elp</code> o <code>.elpx</code> directamente en tu navegador.',
            githubRibbonAriaLabel: 'Haz un fork en GitHub'
        },
        common: {
            language: 'Idioma',
            english: 'English',
            spanish: 'Español',
            notAvailable: '—',
            untitled: '(sin título)',
            unknown: 'Desconocido',
            showPageTitles: 'Mostrar títulos de página ({count})',
            page: 'página',
            pages: 'páginas',
            block: 'bloque',
            blocks: 'bloques',
            component: 'componente',
            components: 'componentes'
        },
        tabs: {
            overview: 'Resumen',
            findings: 'Hallazgos',
            pages: 'Páginas',
            idevices: 'iDevices',
            assets: 'Recursos',
            preview: 'Vista previa',
            edia: '🎓 Validación EDIA'
        },
        upload: {
            ariaLabel: 'Subir archivo .elp, .elpx o .zip',
            titleHtml: 'Arrastra aquí tu archivo <strong>.elp</strong>, <strong>.elpx</strong> o <strong>.zip</strong>',
            subtitle: 'o haz clic para elegir un archivo de tu dispositivo'
        },
        summary: {
            errorsTitle: 'Errores',
            warningsTitle: 'Avisos',
            infoTitle: 'Información',
            format: {
                elpx: 'ELPX moderno',
                elp: 'ELP heredado',
                unknown: 'Desconocido'
            },
            validationResults: 'Resultados de validación:'
        },
        metadata: {
            packageDetails: 'Detalles del paquete',
            fileSize: 'Tamaño del archivo',
            title: 'Título',
            author: 'Autoría',
            language: 'Idioma',
            description: 'Descripción',
            license: 'Licencia',
            version: 'Versión',
            identifier: 'Identificador',
            showRawMetadata: 'Mostrar metadatos sin procesar',
            properties: 'Propiedades',
            resources: 'Recursos'
        },
        checklist: {
            runningCheck: 'Ejecutando comprobación',
            zip: {
                label: 'Verificando la integridad del archivo ZIP',
                labelHtml: 'Verificando la integridad del archivo ZIP',
                success: 'El archivo se cargó correctamente.',
                error: 'El archivo no es un ZIP válido o está dañado.'
            },
            contentXml: {
                label: 'Buscando el manifiesto',
                labelHtml: 'Buscando el manifiesto (<code>content.xml</code> / <code>contentv3.xml</code>)',
                legacyFound: 'Falta content.xml, pero se encontró el archivo heredado contentv3.xml. Este paquete fue creado con una versión de eXeLearning anterior a la 3.0.',
                found: 'Se encontró content.xml en el paquete.',
                missing: 'No se encontraron ni content.xml ni el archivo heredado contentv3.xml.',
                validationFailed: 'La validación falló: {message}'
            },
            folders: {
                label: 'Comprobando las carpetas de recursos recomendadas',
                labelHtml: 'Comprobando las carpetas de recursos recomendadas',
                recommendedMissing: 'No se encontraron las carpetas de recursos recomendadas.',
                detected: 'Se detectó {name}'
            },
            xmlWellFormed: {
                label: 'Validando la sintaxis XML',
                labelHtml: 'Validando la sintaxis de <code>content.xml</code>',
                wellFormed: '{manifest} está bien formado.'
            },
            rootElement: {
                label: 'Comprobando el elemento raíz',
                labelHtml: 'Comprobando el elemento raíz',
                success: 'El elemento raíz es <ode>.',
                skipped: 'Se detectó un formato de manifiesto heredado. Se omitieron las comprobaciones estructurales.'
            },
            navStructures: {
                label: 'Buscando la estructura de navegación',
                labelHtml: 'Verificando las estructuras de navegación',
                success: 'Se encontraron estructuras de navegación.',
                skipped: 'Omitido: los manifiestos heredados de eXeLearning (contentv3.xml) no exponen estructuras de navegación modernas.'
            },
            pages: {
                label: 'Comprobando si hay páginas',
                labelHtml: 'Comprobando si hay páginas',
                found: 'Se encontraron {count} {pageLabel}.',
                empty: 'No se encontraron páginas. El proyecto parece estar vacío.',
                skipped: 'Omitido: los manifiestos heredados de eXeLearning (contentv3.xml) no exponen estructuras de navegación modernas.'
            },
            structure: {
                label: 'Validando la estructura interna',
                labelHtml: 'Validando la estructura interna',
                error: 'Se encontraron {count} {issueLabel} estructurales. Consulta la pestaña Hallazgos para más detalles.',
                warning: '{count} {warningLabel} estructurales. Consulta la pestaña Hallazgos.',
                success: 'La estructura XML interna coincide con el diseño esperado.',
                skipped: 'Omitido: el diseño del manifiesto heredado no es compatible con las reglas estructurales modernas.'
            },
            resources: {
                label: 'Comprobando los recursos enlazados',
                labelHtml: 'Comprobando los recursos enlazados',
                missing: 'Recursos ausentes: {paths} — consulta la pestaña Recursos.',
                allPresent: 'Están presentes los {count} {assetLabel} referenciados.',
                noneDetected: 'No se detectaron recursos enlazados.',
                skipped: 'La validación de recursos no está disponible para manifiestos heredados.'
            },
            issue: 'incidencia',
            issues: 'incidencias',
            warningSingle: 'aviso',
            warningPlural: 'avisos',
            assetSingle: 'recurso',
            assetPlural: 'recursos'
        },
        filters: {
            filter: 'Filtrar:',
            category: 'Categoría:',
            show: 'Mostrar:',
            page: 'Página:',
            allSeverities: 'Todas las severidades',
            errorsOnly: 'Solo errores',
            warningsOnly: 'Solo avisos',
            infoOnly: 'Solo información',
            allCategories: 'Todas las categorías',
            allAssets: 'Todos los recursos',
            referenced: 'Referenciados',
            orphaned: 'Huérfanos / sin referencia',
            missing: 'Ausentes (referenciados pero no incluidos)'
        },
        severity: {
            error: 'Error',
            warning: 'Aviso',
            info: 'Información'
        },
        category: {
            package: 'Paquete',
            xml: 'XML / Esquema',
            navigation: 'Navegación',
            metadata: 'Metadatos',
            idevice: 'iDevice',
            asset: 'Recurso',
            compatibility: 'Compatibilidad'
        },
        findings: {
            empty: 'No hay hallazgos para mostrar.',
            filteredEmpty: 'Ningún hallazgo coincide con los filtros actuales.',
            location: 'Ubicación',
            suggestionPrefix: '💡 ',
            PKG001: { message: 'Archivo ZIP no válido' },
            PKG002: { message: 'Falta el manifiesto content.xml' },
            PKG003: { message: 'Falta content.dtd' },
            PKG004: { message: 'Falta index.html' },
            PKG005: { message: 'Falta la carpeta html/' },
            PKG006: { message: 'Falta la carpeta content/resources/' },
            PKG007: { message: 'Falta la carpeta theme/' },
            PKG008: { message: 'Falta la carpeta libs/' },
            PKG009: { message: 'Falta la carpeta idevices/' },
            PKG010: { message: 'Se detectó path traversal' },
            PKG011: { message: 'Ruta absoluta dentro del archivo' },
            PKG012: { message: 'Nombre de archivo sospechoso' },
            PKG013: { message: 'Rutas normalizadas duplicadas' },
            PKG014: { message: 'Se detectó contentv3.xml heredado' },
            XML001: { message: 'El XML no está bien formado' },
            XML002: { message: 'El elemento raíz no es <ode>' },
            XML003: { message: 'Namespace incorrecto o ausente' },
            XML004: { message: 'Falta el atributo version en <ode>' },
            XML005: { message: 'Falta la declaración DOCTYPE' },
            XML006: { message: 'Orden inesperado de los hijos del elemento raíz' },
            XML007: { message: 'Falta <odeNavStructures>' },
            XML008: { message: 'Elemento hijo desconocido en la raíz' },
            NAV001: { message: 'No se encontraron páginas' },
            NAV002: { message: 'Falta el ID de la página' },
            NAV003: { message: 'Falta el nombre de la página' },
            NAV004: { message: 'Falta el orden de la página' },
            NAV005: { message: 'ID de página duplicado' },
            NAV006: { message: 'Referencia colgante a página padre' },
            NAV007: { message: 'Se detectó un ciclo en la jerarquía de páginas' },
            NAV008: { message: 'Orden inconsistente entre páginas hermanas' },
            NAV009: { message: 'Falta el ID del bloque' },
            NAV010: { message: 'ID de bloque duplicado' },
            NAV011: { message: 'Falta el nombre del bloque' },
            NAV012: { message: 'El ID de página del componente no coincide' },
            NAV013: { message: 'El ID de bloque del componente no coincide' },
            NAV014: { message: 'Falta el ID de iDevice del componente' },
            NAV015: { message: 'ID de iDevice duplicado' },
            NAV016: { message: 'Falta el nombre de tipo del iDevice' },
            NAV017: { message: 'Falta htmlView' },
            NAV018: { message: 'Falta jsonProperties' },
            NAV019: { message: 'Valor de orden no numérico' },
            NAV020: { message: 'Falta el orden del componente' },
            NAV021: { message: 'El componente referencia una página inexistente' },
            NAV022: { message: 'El componente referencia un bloque inexistente' },
            META001: { message: 'Falta odeId' },
            META002: { message: 'Falta odeVersionId' },
            META003: { message: 'Falta eXeVersion' },
            META004: { message: 'Formato de odeId no válido' },
            META005: { message: 'Formato de odeVersionId no válido' },
            META006: { message: 'Falta el título del proyecto' },
            IDEV001: { message: 'Tipo de iDevice desconocido' },
            IDEV002: { message: 'jsonProperties no se puede interpretar' },
            IDEV003: { message: 'htmlView vacío' },
            IDEV004: { message: 'El iDevice de imagen no referencia imágenes' },
            IDEV005: { message: 'El sitio web externo no tiene URL' },
            IDEV006: { message: 'Inconsistencia en el iDevice de descarga' },
            ASSET001: { message: 'Falta en el paquete un recurso referenciado' },
            ASSET002: { message: 'Recurso huérfano' },
            ASSET003: { message: 'Referencia fuera de las rutas de recursos permitidas' },
            ASSET004: { message: 'Path traversal en la referencia del recurso' },
            ASSET005: { message: 'Diferencia de mayúsculas/minúsculas en la referencia del recurso' },
            COMPAT001: { message: 'Se detectó un paquete .elp heredado' },
            COMPAT002: { message: 'Se detectó un paquete .elpx moderno' }
        },
        pages: {
            empty: 'No se encontraron páginas en este paquete.',
            orphaned: 'Páginas huérfanas (referencia colgante a la página padre)'
        },
        idevice: {
            empty: 'No hay información de iDevices disponible.',
            total: 'Total',
            knownDeep: 'Conocidos (profundo)',
            knownShallow: 'Conocidos (superficial)',
            unknown: 'Desconocidos',
            parseErrors: 'Errores de análisis',
            typesUsed: 'Tipos usados',
            type: 'Tipo',
            count: 'Cantidad',
            status: 'Estado',
            statuses: {
                missing: 'ausente',
                unknown: 'desconocido',
                'deep-validated': 'validado en profundidad',
                'shallow-validated': 'validado de forma superficial',
                'package-local': 'local del paquete'
            }
        },
        assets: {
            totalFiles: 'Archivos totales',
            referenced: 'Referenciados',
            missing: 'Ausentes',
            orphaned: 'Huérfanos',
            path: 'Ruta',
            type: 'Tipo',
            extension: 'Extensión',
            status: 'Estado',
            preview: 'Vista previa',
            empty: 'No se encontraron recursos.',
            missingEmpty: 'No se detectaron recursos ausentes.',
            showingLimit: 'Mostrando {shown} de {total} recursos…',
            statuses: {
                missing: 'ausente',
                referenced: 'referenciado',
                orphaned: 'huérfano',
                structural: 'estructural'
            }
        },
        preview: {
            placeholder: '— selecciona una página —',
            frameTitle: 'Vista previa de la página',
            errorLoading: 'Error al cargar la vista previa: {message}'
        },
        footer: {
            processing: 'Todo el procesamiento ocurre en tu navegador. No se sube ningún archivo a un servidor.',
            builtWith: 'Desarrollado con JSZip y JavaScript sin frameworks.',
            creditsHtml: '© 2025 – <a href="https://www3.gobiernodecanarias.org/medusa/ecoescuela/ate" target="_blank" rel="noopener noreferrer">Área de Tecnología Educativa</a> – Gobierno de Canarias'
        },
        edia: {
            tabAriaLabel: 'Secciones de validación',
            hero: {
                title: 'Panel de calidad EDIA',
                subtitleHtml: 'Este panel evalúa tu recurso de eXeLearning con la lista de verificación de calidad de recursos educativos abiertos de <strong>EDIA / CEDEC</strong>. Algunos criterios se comprueban automáticamente a partir del paquete; otros requieren juicio humano y se marcan para revisión manual.',
                checklistLink: '🌐 Lista EDIA (CEDEC)',
                rubricLink: '📄 Descargar rúbrica EDIA (PDF)'
            },
            legend: {
                ariaLabel: 'Leyenda de colores de estado',
                label: 'Clave de estado:'
            },
            statuses: {
                green: 'Cumple',
                orange: 'Revisar',
                red: 'Falta'
            },
            validationTypes: {
                automatic: 'Automática',
                heuristic: 'Heurística',
                manual: 'Revisión manual'
            },
            summary: {
                totalCriteria: 'Criterios totales',
                totalCriteriaDesc: 'Todos los criterios evaluados',
                compliant: 'Cumple',
                compliantDesc: 'Criterios que se cumplen',
                needsReview: 'Revisar',
                needsReviewDesc: 'Criterios que requieren atención',
                missing: 'Faltan / fallan',
                missingDesc: 'Criterios no cumplidos',
                readinessScore: 'Índice de preparación',
                readinessAria: 'Preparación {score}%',
                readinessDesc: 'Basado en criterios comprobables automáticamente'
            },
            labels: {
                detected: 'Detectado:',
                recommendationPrefix: '💡'
            },
            noFile: {
                textHtml: 'Carga un archivo <strong>.elpx</strong> o <strong>.elp</strong> usando la zona de subida superior para ver tu evaluación de calidad EDIA personalizada.',
                subtext: 'Los criterios siguientes se muestran con estados provisionales. Se actualizarán automáticamente cuando se cargue un archivo.'
            },
            sections: {
                cover: 'Portada / Identificación',
                methodology: 'Metodología didáctica',
                contents: 'Contenidos',
                activities: 'Actividades y tareas',
                teacher: 'Guía docente',
                learning: 'Potencial de aprendizaje',
                adaptability: 'Adaptabilidad',
                interactivity: 'Interactividad',
                technical: 'Requisitos técnicos',
                format: 'Formato y estilo',
                accessibility: 'Accesibilidad',
                licensing: 'Licencias y derechos de autor',
                inclusive: 'Comunicación inclusiva'
            },
            criteria: {
                'EDIA-COV-01': { title: 'El recurso tiene título', description: 'Todo recurso educativo debe tener un título claro y descriptivo para que alumnado y profesorado identifiquen rápidamente su temática.' },
                'EDIA-COV-02': { title: 'La autoría está identificada', description: 'El recurso debe acreditar a su autoría para que las personas usuarias sepan quién lo creó y puedan contactar en caso de dudas.' },
                'EDIA-COV-03': { title: 'Se declara el idioma', description: 'Declarar el idioma ayuda al alumnado y a los sistemas de catalogación a localizar recursos en la lengua adecuada.' },
                'EDIA-COV-04': { title: 'Hay una descripción o resumen breve', description: 'Un resumen corto ayuda a decidir si el recurso es relevante antes de abrirlo.' },
                'EDIA-COV-05': { title: 'Se indica la etapa educativa destinataria', description: 'El recurso debe especificar el público objetivo (por ejemplo, primaria, secundaria, universidad) para que pueda utilizarse adecuadamente.' },
                'EDIA-COV-06': { title: 'Se indica la materia o temática', description: 'Etiquetar la materia o el ámbito temático mejora la localización del recurso en repositorios.' },
                'EDIA-MET-01': { title: 'Se explicitan los objetivos de aprendizaje', description: 'Los objetivos de aprendizaje claros ayudan al alumnado a comprender qué logrará y permiten al profesorado alinear el recurso con el currículo.' },
                'EDIA-MET-02': { title: 'El recurso tiene una secuencia didáctica coherente', description: 'El contenido debe organizarse en una progresión lógica que construya el conocimiento paso a paso.' },
                'EDIA-MET-03': { title: 'El recurso promueve el aprendizaje activo', description: 'Los buenos recursos digitales incluyen actividades que implican activamente al alumnado en lugar de limitarse a leer o mirar.' },
                'EDIA-MET-04': { title: 'Existen mecanismos de retroalimentación', description: 'El alumnado se beneficia de recibir retroalimentación inmediata sobre sus respuestas o acciones, ya sea automática o mediante orientaciones textuales.' },
                'EDIA-CON-01': { title: 'El contenido se organiza en páginas o secciones', description: 'Dividir el contenido en páginas o secciones claramente delimitadas facilita la navegación y la comprensión.' },
                'EDIA-CON-02': { title: 'Se utilizan recursos multimedia', description: 'Las imágenes, el audio y el vídeo hacen el aprendizaje más atractivo y ayudan a distintos estilos de aprendizaje.' },
                'EDIA-CON-03': { title: 'El contenido es científicamente correcto y está actualizado', description: 'La información presentada debe ser correcta y vigente. Esto solo puede verificarlo una persona experta en la materia.' },
                'EDIA-CON-04': { title: 'El lenguaje del contenido es adecuado para el público', description: 'El vocabulario y la complejidad del lenguaje deben ajustarse al nivel del alumnado destinatario.' },
                'EDIA-CON-05': { title: 'Los enlaces externos están claramente identificados', description: 'Si el recurso remite a sitios web externos, esos enlaces deben estar bien etiquetados y abrirse en una pestaña nueva.' },
                'EDIA-ACT-01': { title: 'Se incluyen actividades interactivas', description: 'El recurso debería incluir al menos un elemento interactivo (cuestionario, ejercicio, arrastrar y soltar, etc.) que implique activamente al alumnado.' },
                'EDIA-ACT-02': { title: 'Las actividades están alineadas con los objetivos de aprendizaje', description: 'Cada actividad debería vincularse al menos con uno de los objetivos de aprendizaje declarados.' },
                'EDIA-ACT-03': { title: 'Las actividades incluyen instrucciones claras', description: 'El alumnado debe saber con claridad qué hacer en cada actividad sin necesitar explicaciones adicionales del profesorado.' },
                'EDIA-ACT-04': { title: 'Existe variedad de tipos de actividad', description: 'Utilizar diferentes tipos de actividades (opción múltiple, respuesta abierta, clasificación, simulación) atiende a la diversidad del alumnado.' },
                'EDIA-TCH-01': { title: 'Se ofrece orientación docente', description: 'Una guía o notas para el profesorado ayudan a entender cómo utilizar el recurso de forma eficaz en el aula.' },
                'EDIA-TCH-02': { title: 'Se indica la duración estimada', description: 'Indicar el tiempo aproximado necesario para completar el recurso ayuda al profesorado a planificar sus sesiones.' },
                'EDIA-TCH-03': { title: 'Se indica la alineación curricular', description: 'Relacionar el recurso con estándares curriculares o competencias específicas aumenta su utilidad en contextos de educación formal.' },
                'EDIA-LRN-01': { title: 'El recurso favorece el pensamiento de orden superior', description: 'Los mejores recursos piden al alumnado analizar, evaluar o crear, no solo recordar datos.' },
                'EDIA-LRN-02': { title: 'El recurso fomenta la colaboración o el aprendizaje social', description: 'Las actividades que promueven discusión, revisión entre iguales o trabajo en grupo amplifican el impacto del aprendizaje.' },
                'EDIA-ADP-01': { title: 'El recurso está empaquetado en un formato abierto y reutilizable', description: 'El formato ELPX / ELP permite importar el recurso en cualquier plataforma compatible con eXeLearning y modificarlo por otras personas.' },
                'EDIA-ADP-02': { title: 'El contenido puede usarse sin depender de una plataforma concreta', description: 'El recurso debería funcionar sin requerir un sistema propietario o una suscripción específica.' },
                'EDIA-ADP-03': { title: 'El recurso puede adaptarse o remezclarse', description: 'Una licencia abierta y una estructura modular facilitan que el profesorado adapte el recurso a su propio contexto.' },
                'EDIA-INT-01': { title: 'Hay iDevices interactivos presentes', description: 'Los iDevices de eXeLearning, como cuestionarios, actividades SCORM o ejercicios interactivos, aumentan la implicación.' },
                'EDIA-INT-02': { title: 'La interactividad va más allá de una navegación pasiva', description: 'Limitarse a hacer clic en “siguiente página” no es suficiente. El recurso debe pedir al alumnado responder, elegir o crear.' },
                'EDIA-TEC-01': { title: 'La integridad del paquete es válida', description: 'El archivo debe ser un ZIP válido y sin errores de corrupción para que pueda abrirse de forma fiable.' },
                'EDIA-TEC-02': { title: 'El manifiesto XML está bien formado', description: 'El archivo content.xml debe ser XML sintácticamente válido para que cualquier herramienta compatible con eXeLearning pueda analizarlo.' },
                'EDIA-TEC-03': { title: 'Todos los recursos referenciados están presentes', description: 'Las imágenes, el audio y otros archivos referenciados deben incluirse en el paquete. Los recursos ausentes rompen la experiencia de aprendizaje.' },
                'EDIA-TEC-04': { title: 'El recurso usa el formato moderno ELPX', description: 'Se recomienda el formato moderno ELPX (eXeLearning ≥ 3.0) para lograr la mejor compatibilidad con las plataformas actuales.' },
                'EDIA-TEC-05': { title: 'No se detectan errores críticos de validación', description: 'El paquete debería superar todas las reglas estructurales sin errores críticos que impidan su carga correcta.' },
                'EDIA-FMT-01': { title: 'La presentación visual es consistente', description: 'Un estilo visual coherente (tipografías, colores y espaciados) en todas las páginas crea una experiencia de aprendizaje profesional y centrada.' },
                'EDIA-FMT-02': { title: 'Las imágenes y medios tienen una calidad adecuada', description: 'Las imágenes borrosas o el audio de baja calidad afectan negativamente a la experiencia de aprendizaje.' },
                'EDIA-FMT-03': { title: 'El texto es legible y está bien formateado', description: 'El contenido debe usar adecuadamente encabezados, listas y espacios en blanco para facilitar la lectura y la comprensión.' },
                'EDIA-ACC-01': { title: 'Las imágenes cuentan con texto alternativo', description: 'Toda imagen significativa debe tener un texto alternativo descriptivo para que las personas usuarias de lectores de pantalla puedan acceder al contenido.' },
                'EDIA-ACC-02': { title: 'El contraste de color es suficiente', description: 'El texto debe tener suficiente contraste respecto al fondo para ser legible por personas con baja visión o daltonismo.' },
                'EDIA-ACC-03': { title: 'El contenido no depende solo del color', description: 'La información transmitida mediante color también debe comunicarse por texto u otra señal visual.' },
                'EDIA-ACC-04': { title: 'El contenido multimedia dispone de subtítulos o transcripción', description: 'El audio y el vídeo deberían incluir subtítulos o transcripciones para alumnado sordo o con dificultades auditivas.' },
                'EDIA-ACC-05': { title: 'El recurso no presenta destellos ni parpadeos rápidos', description: 'El contenido parpadeante puede provocar crisis fotosensibles. El recurso debe evitar esos elementos.' },
                'EDIA-LIC-01': { title: 'La licencia está declarada', description: 'Todo recurso educativo abierto debe indicar claramente su licencia para que las personas usuarias sepan cómo pueden reutilizarlo, compartirlo o adaptarlo.' },
                'EDIA-LIC-02': { title: 'La licencia permite la reutilización educativa', description: 'Idealmente, la licencia debería permitir el uso libre en contextos educativos. Las licencias Creative Commons son recomendables para los REA.' },
                'EDIA-LIC-03': { title: 'Se respetan los derechos del contenido de terceros', description: 'Las imágenes, el audio o el vídeo procedentes de fuentes externas deben ser originales o usarse con una licencia que permita su inclusión.' },
                'EDIA-INC-01': { title: 'El lenguaje es inclusivo o no sexista', description: 'El recurso debe emplear un lenguaje inclusivo que no excluya ni estereotipe al alumnado por razón de género.' },
                'EDIA-INC-02': { title: 'Las imágenes y los ejemplos reflejan diversidad', description: 'Los materiales visuales y los ejemplos deben representar a personas, contextos y perspectivas diversas.' },
                'EDIA-INC-03': { title: 'El contenido evita sesgos culturales o sociales', description: 'El recurso debe respetar diferentes culturas, religiones y grupos sociales.' }
            }
        }
    };
});
