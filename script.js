"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
let map;
let mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ["January", "February", "March", "April", "May", "June", "July", 
      "August", "September", "October", "November", "December"
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calPace();
    this._setDescription();
  }
  calPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
const run1 = new Running([-4, -35], 5.2, 24, 17);
const cyc1 = new Cycling([-4, -35], 26, 90, 520);

class App {
  _workouts = [];
  _map;
  _mapEvent;
  constructor() {
    // Запуск логики приложения
    this._getPosition();

    // Получение данных из LS
    this._getLocalStorage();

    // Обработчик события который вызывает метод __newWorkout.
    form.addEventListener("submit", this._newWorkout.bind(this));

    // Обработчик события который вызывает метод _toogleField.
    inputType.addEventListener("change", this._toggleField);

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      // проверяем, что у браузера есть доступ к API
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // нужно явно передать this в контекст вызова, так как эта функция вызывается не внутри самого класса, а внутри функции, в строгом режими this будет означать undefined

        // Модальное окно в случае отказа
        function () {
          // функция будет вызвана, есди пользователь запретит доступ к своей геолокации
          alert("Вы запретили доступ к своей геопозиции.");
        }
      );
    }
  }

  // Метод загрузки карты на страницу, в случае положительного ответа о предоставлении своих координат
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this._map = L.map("map").setView(coords, 13); // 13 - уровень первоначального зума, значение больше значит ближе (на 5 видно страны)

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this._map);

    //Обработчик события нажатия по карте, который запустит метод _showForm
    this._map.on("click", this._showForm.bind(this));

    // Отображение маркеров тренировок тогда, когда загружается карта
    this._workouts.forEach((work) => 
    this._renderWorkMarker(work));
  }

  //Метод который отобразит форму при клике по карте.
  _showForm(mapE) {
    this._mapEvent = mapE; // this в оброботчиках события - это DOM - элемент, с оторым мы работаем
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // Метод который переключает типы тренировок.
  _toggleField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  // Метод который установит маркер на карту.
  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp)); // ifFinite - возвращает true если ему передано число, дает false если ему передана бесконечность
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // Данные из форм
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this._mapEvent.latlng;
    let workout;

    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert("Необходимо ввести целое положительное число");
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) // elevation (подъем) может быть отрицательным
      ) {
        return alert("Необходимо ввести целое положительное число");
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Добаление новой тренировки в массив
    this._workouts.push(workout);

    // Рендер маркера тренировки на карте
    this._renderWorkMarker(workout);

    // Отображение тренировки
    this._renderWorkout(workout);

    // Очистить поля ввода и спрятать форму
    this._hideForm();

    this._setLocalStorage();
  }
  _renderWorkMarker(workout) {
    L.marker(workout.coords)
      .addTo(this._map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: "mark-popup",
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }
  // Отчистить поля ввода и спрятать форму
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.classList.add("hidden");
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">км</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">мин</span>
    </div>`;
    if (workout.type === "running") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">мин/км</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏻</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">шаг</span>
      </div>
      `;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">км/час</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🗻</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">м</span>
      </div>
      `;
    }
    form.insertAdjacentHTML("afterend", html);
  }
  _moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');
    if (!workoutEL) return;

    const workout = this._workouts.find(work => work.id === workoutEL.dataset.id);
    this._map.setView(workout.coords, 13, {animate: true, pan: {duration: 1}})
  }
  
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this._workouts)) // При использовании JSON формата теряется прототипное наследование
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);
    if (!data) return;
    this._workouts = data;
    this._workouts.forEach((work) => this._renderWorkout(work));
  }

  // Это публичный метод, его можно использовать изне для очистки local storage
  reset() {
    localStorage.removeItem();
    location.reload();
  }
}

const app = new App();
