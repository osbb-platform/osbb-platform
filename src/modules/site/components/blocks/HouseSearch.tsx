export function HouseSearch() {
  return (
    <div className="osbb-house-search">
      <label htmlFor="site-house-search">
        Введіть адресу або назву ОСББ
      </label>

      <div className="osbb-house-search__row">
        <input
          autoComplete="street-address"
          id="site-house-search"
          minLength={3}
          placeholder="Наприклад, Соборна 186"
          type="search"
        />

        <button className="osbb-btn osbb-btn--primary" type="button">
          Знайти
        </button>
      </div>

      <p className="osbb-note">
        Пошук буде підключений до реєстру будинків у задачі C3.
      </p>
    </div>
  );
}
