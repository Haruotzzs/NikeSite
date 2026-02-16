// Модуль для слайдера
let currentIndex = 0;
let slides, totalSlides, sliderRange;

export function initSlider() {
  slides = document.querySelector(".slides");
  totalSlides = document.querySelectorAll(".slide").length;
  sliderRange = document.querySelector(".slider-range");

  const prev = document.querySelector(".prev");
  const next = document.querySelector(".next");

  if (!slides || !sliderRange || !prev || !next) return;

  prev.addEventListener("click", () => changeSlide(-1));
  next.addEventListener("click", () => changeSlide(1));

  sliderRange.addEventListener("input", (e) => {
    const percent = e.target.value;
    const slideWidth = slides.clientWidth / totalSlides;
    currentIndex = Math.round((percent / 100) * (totalSlides - 1));
    updateSlide();
  });

  updateSlide();
}

function changeSlide(direction) {
  currentIndex += direction;

  if (currentIndex >= totalSlides) {
    currentIndex = 0;
  } else if (currentIndex < 0) {
    currentIndex = totalSlides - 1;
  }

  updateSlide();
}

function updateSlide() {
  if (!slides) return;
  slides.style.transform = `translateX(${-currentIndex * 100}%)`;

  if (sliderRange) {
    sliderRange.value = (currentIndex / (totalSlides - 1)) * 100;
  }
}
