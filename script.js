let model, webcam, maxPredictions;
let isWebcamActive = false;
let webcamAnimationFrame;
let predictionInterval;

// Inicializar el modelo y la webcam
async function init() {
    const modelURL = "model/model.json";  // Ruta al archivo model.json dentro de la carpeta 'model'
    const metadataURL = "model/metadata.json";  // Ruta al archivo metadata.json dentro de la carpeta 'model'

    try {
        // Cargar el modelo de Teachable Machine
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Configurar la webcam
        const flip = true; // Voltea la imagen horizontalmente si es necesario
        webcam = new tmImage.Webcam(224, 224, flip); // Crear un objeto de webcam
        await webcam.setup(); // Solicitar acceso a la webcam
        await webcam.play();
        
        // Añadir el canvas generado al contenedor
        document.getElementById("webcam-container").appendChild(webcam.canvas);

        // Iniciar la actualización en tiempo real de la webcam si está activa
        if (isWebcamActive) {
            startWebcamLoop();
        }
    } catch (error) {
        console.error("Error cargando el modelo o configurando la webcam:", error);
    }
}

// Función para iniciar el loop de la webcam
function startWebcamLoop() {
    if (webcam) {
        webcam.update(); // Actualizar el frame de la webcam
        webcamAnimationFrame = requestAnimationFrame(startWebcamLoop);
    }
}

// Función para detener el loop de la webcam
function stopWebcamLoop() {
    if (webcamAnimationFrame) {
        cancelAnimationFrame(webcamAnimationFrame);
        webcamAnimationFrame = null;
    }
}

// Función para detener el stream de la webcam
function stopWebcamStream() {
    if (webcam && webcam.stream) {
        const tracks = webcam.stream.getTracks();
        tracks.forEach(track => track.stop());
        webcam.stream = null;
    }
}

// Función para iniciar la predicción con la webcam con un retraso inicial y un intervalo de 5 segundos
async function startPredictionWithDelay() {
    if (!webcam) {
        await init();  // Inicializar la webcam si no está inicializada
    }

    isWebcamActive = true;  // Marcar la webcam como activa
    startWebcamLoop();  // Iniciar el loop de actualización en tiempo real

    // Asegurarse de que la webcam está en funcionamiento y visible
    document.getElementById("webcam-container").style.display = 'block';
    document.getElementById("uploaded-image").style.display = 'none';

    // Empezar la predicción después de 2 segundos y repetir cada 5 segundos
    setTimeout(() => {
        predictionInterval = setInterval(predictFromWebcam, 5000);
        predictFromWebcam();  // Ejecutar la primera predicción inmediatamente después del retraso
    }, 2000);
}

// Función para detener la predicción y la webcam
function stopPrediction() {
    if (predictionInterval) {
        clearInterval(predictionInterval);
        predictionInterval = null;
    }

    stopWebcamLoop();  // Detener el loop de actualización de la webcam
    stopWebcamStream();  // Detener el stream de la webcam

    isWebcamActive = false;  // Marcar la webcam como inactiva
    document.getElementById("webcam-container").style.display = 'none';  // Ocultar el contenedor de la webcam
}

// Función para predecir con la webcam
async function predictFromWebcam() {
    if (webcam && isWebcamActive) {
        // Obtener la imagen de la webcam
        await webcam.update(); // Actualizar el frame de la webcam antes de predecir
        const prediction = await model.predict(webcam.canvas);
        displayResults(prediction);
    }
}

// Función para predecir con una imagen cargada
async function predictImage(input) {
    const file = input.files[0];
    const img = document.getElementById('uploaded-image');
    
    // Detener la webcam si está activa
    if (webcam && isWebcamActive) {
        stopPrediction();
    }

    // Mostrar la imagen cargada y ocultar el canvas de la webcam
    img.style.display = 'block';
    img.src = URL.createObjectURL(file);
    
    img.onload = async () => {
        const prediction = await model.predict(img);
        displayResults(prediction);
    };
    
    document.getElementById("webcam-container").style.display = 'none';
}

// Mostrar solo el resultado de la predicción con mayor probabilidad
function displayResults(predictions) {
    // Ordenar las predicciones por probabilidad descendente
    predictions.sort((a, b) => b.probability - a.probability);

    // Obtener la predicción con la mayor probabilidad
    const topPrediction = predictions[0];
    let resultText;
    const modalContent = document.getElementById("modal-content");
    const goodSound = document.getElementById("goodSound");
    const badSound = document.getElementById("badSound");
    const errorSound = document.getElementById("errorSound");

    // Detener sonidos en caso de que estuvieran reproduciéndose
    goodSound.pause();
    badSound.pause();
    errorSound.pause();
    goodSound.currentTime = 0;
    badSound.currentTime = 0;
    errorSound.currentTime = 0;

    // Verificar las diferentes clases de predicción
    console.log("Predicción de la clase superior:", topPrediction.className); // Para depuración

    if (topPrediction.className.trim() === "Buen estado") {
        resultText = "El tornillo está en buen estado.";
        modalContent.className = 'modal-content green';
        goodSound.play();  // Reproducir el sonido de campana
    } else if (topPrediction.className.trim() === "No Tornillo") {
        resultText = "No se reconoce tornillo, reintente.";
        modalContent.className = 'modal-content yellow';
        errorSound.play();  // Reproducir el sonido de error
    } else {
        resultText = `El tornillo presenta ${topPrediction.className}.`;
        modalContent.className = 'modal-content red';
        badSound.play();  // Reproducir el sonido de alarma
    }

    // Mostrar el resultado en el elemento <p> con id="prediction-result"
    document.getElementById("prediction-result").innerHTML = resultText;

    // Mostrar el modal
    document.getElementById("resultModal").style.display = "block";
}

// Función para cerrar el modal
function closeModal() {
    document.getElementById("resultModal").style.display = "none";
}

// Manejar el evento de carga de imagen
document.getElementById('upload-image').addEventListener('change', (event) => {
    predictImage(event.target);
});

// Llamar a la función de inicialización al cargar la página
window.onload = init;
