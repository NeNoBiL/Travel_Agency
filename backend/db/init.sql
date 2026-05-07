DROP DATABASE IF EXISTS touragency;
CREATE DATABASE touragency;
\c touragency;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user'
);

-- Таблица туров
CREATE TABLE tours (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    duration_days INTEGER,
    price DECIMAL(10,2),
    max_participants INTEGER,
    available_seats INTEGER,
    image_url TEXT
);

-- Таблица бронирований
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
    participants_count INTEGER,
    total_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'confirmed',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Проверка мест перед бронированием
CREATE OR REPLACE FUNCTION check_available_seats()
RETURNS TRIGGER AS $$
DECLARE
    available INT;
BEGIN
    SELECT available_seats INTO available FROM tours WHERE id = NEW.tour_id;
    IF available < NEW.participants_count THEN
        RAISE EXCEPTION 'Недостаточно свободных мест. Доступно: %, запрошено: %', available, NEW.participants_count;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_seats_before_booking 
    BEFORE INSERT ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION check_available_seats();

-- Уменьшение мест после бронирования
CREATE OR REPLACE FUNCTION update_available_seats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tours 
    SET available_seats = available_seats - NEW.participants_count
    WHERE id = NEW.tour_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seats_on_booking 
    AFTER INSERT ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_available_seats();

-- Возврат мест при отмене бронирования
CREATE OR REPLACE FUNCTION return_seats_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE tours 
        SET available_seats = available_seats + OLD.participants_count
        WHERE id = OLD.tour_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_seats_on_cancel_trigger 
    AFTER UPDATE OF status ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION return_seats_on_cancel();

-- Пользователи (пароль: admin, user123)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@touragency.com', '$2b$10$YKqB5ZXKPcXWU3xZ0qZBSeZqK9bK9bK9bK9bK9bK9bK9bK9bK9b', 'admin'),
('user1', 'user1@example.com', '$2b$10$YKqB5ZXKPcXWU3xZ0qZBSeZqK9bK9bK9bK9bK9bK9bK9bK9bK9b', 'user');

-- Туры
INSERT INTO tours (title, description, country, city, duration_days, price, max_participants, available_seats, image_url) VALUES
('Париж - город любви', 'Романтическое путешествие в Париж с посещением Эйфелевой башни, Лувра и Монмартра. Включен ужин на Эйфелевой башне.', 'Франция', 'Париж', 7, 85000, 30, 25, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'),
('Отдых на Бали', 'Райский отдых на острове Бали с йогой, серфингом и экскурсиями. Проживание в отеле 5* с бассейном.', 'Индонезия', 'Денпасар', 10, 120000, 25, 20, 'https://images.unsplash.com/photo-1537996194471-e657df975ab4'),
('Сафари в Кении', 'Незабываемое сафари с наблюдением за дикими животными в национальных парках. Проживание в лоджах.', 'Кения', 'Найроби', 8, 150000, 20, 15, 'https://images.unsplash.com/photo-1516426122078-c23e76319801'),
('Путешествие по Осетии', 'Путешествие по Осетии.', 'Россия', 'Осетия', 5, 45000, 40, 27, 'https://islamnews.ru/wp-content/uploads/2024/01/23c107d8d9f16570cb4df6d2a6da0ac5.png'),
('Новый год в Лапландии', 'Сказочное новогоднее путешествие в резиденцию Деда Мороза. Катание на оленьих упряжках.', 'Финляндия', 'Рованиеми', 6, 95000, 25, 23, 'https://avatars.mds.yandex.net/i?id=babac44e48b22b9eb316349f750699a46e5279bb-5247746-images-thumbs&n=13'),
('Гастротур по Италии', 'Кулинарное путешествие по Италии с дегустацией вин и сыров. Мастер-классы от шеф-поваров.', 'Италия', 'Рим', 9, 110000, 20, 18, 'https://kompastour.com/useruploads/excurs/excurs_11eb791584.jpg');
