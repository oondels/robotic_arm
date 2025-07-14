#include <ESP32Servo.h>
#include <string>

class Joint {
public:
  Joint(int pin, const std::string& name, double initialDeg, double speed = 0)
    : pin(pin), name(name), initialDeg(initialDeg), speed(speed) {}

  void begin() {
    servo.attach(pin, 500, 2500);
    servo.write(initialDeg);
  }

  void write(int angle) {
    servo.write(angle);
  }

  void move_front() {}

private:
  Servo servo;
  int pin;
  std::string name;
  double initialDeg;
  double speed;
};

class RoboticArm(){};

Joint shoulderMotor(13, "Shoulder", 90);
Joint elbowMotor(12, "Elbow", 90);

void setup() {
  Serial.begin(115200);

  shoulderMotor.begin();
  elbowMotor.begin();
  delay(1000);
}

void loop() {
  // shoulderMotor.write(0);
  // elbowMotor.write(0);
  // Serial.println("0°");
  // delay(1000);

  // Serial.println("180°");
  // shoulderMotor.write(180);
  // elbowMotor.write(180);
  // delay(1000);
}
