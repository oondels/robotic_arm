// Initial points in a triangle
const A = [0, 0]; // -> Fixo
let B = [0, 10]; // -> Variavel
let C = [10, 10]; // -> Variavel

const lawOfCosines = (a, b, c, angle, side) => {
  // convert degrees → radians
  const θ = angle * Math.PI / 180;

  switch (side.toLowerCase()) {
    case 'a':
      // a² = b² + c² − 2bc·cos(A)
      if (b == null || c == null) throw new Error("Need b and c to find a");
      return Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(θ));

    case 'b':
      // b² = a² + c² − 2ac·cos(B)
      if (a == null || c == null) throw new Error("Need a and c to find b");
      return Math.sqrt(a * a + c * c - 2 * a * c * Math.cos(θ));

    case 'c':
      // c² = a² + b² − 2ab·cos(C)
      if (a == null || b == null) throw new Error("Need a and b to find c");
      return Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(θ));

    default:
      throw new Error("`side` must be one of 'a', 'b', or 'c'");
  }
};

/**
 * Converts degrees to radians.
 * @param {number} deg - Angle in degrees.
 * @returns {number} Angle in radians.
 */
function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} rad - Angle in radians.
 * @returns {number} Angle in degrees.
 */
function toDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Calcula o ângulo interno A (em graus) de um losango dado
 * o comprimento do lado `a` e o comprimento da diagonal maior `p` -> Distancia da garra.
 * Derivado de: p = a * sqrt(2 + 2 cos A)  ⇒  cos A = (p²/a² - 2) / 2
 * @param {number} a - Comprimento do lado do losango.
 * @param {number} p - Comprimento da diagonal maior AC.
 * @throws Irá lançar um Error se a diagonal não for compatível com o comprimento do lado.
 * @returns {number} Ângulo interno em A em graus.
 */
const calcAngleBasedClawDistance = (a, p, complementaryAngle = false) => {
  const cosA = (p * p / (a * a) - 2) / 2;

  if (cosA < -1 || cosA > 1) throw new Error('Diagonal incompatível com lado a');

  if (complementaryAngle) return 180 - toDeg(Math.acos(cosA));
  return toDeg(Math.acos(cosA));
}

class Joint {
  // Colocar ang min e max tambem
  constructor(name, x, y, z = 0, angle, movel = true) {
    this.name = name
    this.x = x
    this.y = y
    this.z = z // Desativado eixo z no inicio
    this.angle = angle
    this.movel = movel

    // Outras configurações do arduino e servo irão aqui
  }

  getAngle() {
    return this.angle
  }

  coordinates() {
    return [this.x, this.y, this.z]
  }

  // Atualiza angulo do motor e recalcula e atualiza coordenadas no mapa se a junta for móvel no plano
  updateAngle(newAngle) {
    this.angle = newAngle
    if (this.movel) {
      // atualizar posicao no mapa
      // 
    }
  }

  updateCoordinates(x, y, z = this.z) {
    if (this.movel) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
}

const shoulder = new Joint("shoulder", 0, 0, 0, 50, false)
const elbow = new Joint("elbow", 0, 10, 0, 90)
const claw = new Joint("claw", 10, 10, 0, 45)

class RoboticArm {
  constructor(shoulderJoint, elbowJoint, clawJoint) {
    this.shoulderJoint = shoulderJoint;
    this.elbowJoint = elbowJoint;
    this.clawJoint = clawJoint;

    // Comprimentos fixos dos segmentos do braço
    this.segmentLength1 = 10; // Ombro para cotovelo
    this.segmentLength2 = this.segmentLength1; // Cotovelo para garra

    this.updateArmGeometry();
  }

  updateArmGeometry() {
    this.A = this.shoulderJoint.coordinates();
    this.B = this.elbowJoint.coordinates();
    this.C = this.clawJoint.coordinates();
    // Ponto de referencia para o Losango (Referencial do braco)
    this.D = [10, 0]

    this.AB = [this.B[0] - this.A[0], this.B[1] - this.A[1]];
    this.BC = [this.C[0] - this.B[0], this.C[1] - this.B[1]];
    this.AC = [this.C[0] - this.A[0], this.C[1] - this.A[1]];
    this.AD = [this.D[0] - this.A[0], this.D[1] - this.A[1]]

    this.moduloAB = Math.sqrt(this.AB[0] ** 2 + this.AB[1] ** 2);
    this.moduloBC = Math.sqrt(this.BC[0] ** 2 + this.BC[1] ** 2);
    this.moduloAC = Math.sqrt(this.AC[0] ** 2 + this.AC[1] ** 2);
    this.moduloAD = Math.sqrt(this.AD[0] ** 2 + this.AD[1] ** 2);

    this.a = this.moduloBC; // Distância BC
    this.b = this.moduloAC; // Distância AC (distância da garra)
    this.c = this.moduloAB; // Distância AB
    this.d = this.moduloAD  // Referencia para formação do Losango
  }

  moveClawFront(distance) {
    console.log(`\nMovendo garra ${distance} unidades para frente...`);
    // Para mover para frente, deve-se alterar o valor da reta AC para o tamanho final do movimento
    // Exemplo: mover garra dois cm para frente é resultado da trigonometria para calcular os angulos nas `Joints` Shoulder e Elbow
    const newClawDistance = this.b + distance

    // Verificar se o movimento é possível
    const maxReach = this.segmentLength1 + this.segmentLength2;
    const minReach = Math.abs(this.segmentLength1 - this.segmentLength2);

    if (newClawDistance > maxReach || newClawDistance < minReach) {
      console.log(`Movimento impossível. Alcance deve estar entre ${minReach} e ${maxReach}`);
      return;
    }

    // Calcular novos ângulos usando lei dos cossenos
    // Para um braço de dois segmentos, calculamos os ângulos internos do triângulo
    // Calculo com lei dos cossenos para achar novos angulos -> Ver mais informacoes na documentacao
    // p = a √(2 - 2 cos(B))


    //* Recalcula a angulação dos motores (Joints) para atender ao movimento
    // Ângulo no cotovelo (interno do losango)
    const shoulderAngleDegrees = calcAngleBasedClawDistance(this.segmentLength1, newClawDistance)
    // Ângulo no ombro (interno do losango)
    const elbowAngleDegrees = calcAngleBasedClawDistance(this.segmentLength1, newClawDistance, true)
    console.log(`Novo ângulo do ombro: ${shoulderAngleDegrees.toFixed(2)}°`);
    console.log(`Novo ângulo do cotovelo: ${elbowAngleDegrees.toFixed(2)}°`);

    // Atualizar os ângulos das joints
    this.shoulderJoint.updateAngle(shoulderAngleDegrees);
    this.elbowJoint.updateAngle(elbowAngleDegrees);

    return

    //* Calcular novas posições das Joints no plano cartesiano (Coordenadas)
    // Cotovelo: posição baseada no ângulo do ombro
    // const elbowX = this.shoulderJoint.x + this.segmentLength1 * Math.cos(shoulderAngleRad);
    const elbowX = this.segmentLength1 * Math.cos(shoulderAngleRad);
    // const elbowY = this.shoulderJoint.y + this.segmentLength1 * Math.sin(shoulderAngleRad);
    const elbowY = this.segmentLength1 * Math.sin(shoulderAngleRad);

    // Garra: posição baseada na posição do cotovelo e ângulo do cotovelo
    const clawAngleFromHorizontal = shoulderAngleRad + (Math.PI - elbowAngleRad);
    const clawX = elbowX + this.segmentLength2 * Math.cos(clawAngleFromHorizontal);
    const clawY = elbowY + this.segmentLength2 * Math.sin(clawAngleFromHorizontal);

    // Atualizar coordenadas das joints móveis
    this.elbowJoint.updateCoordinates(elbowX, elbowY);
    this.clawJoint.updateCoordinates(clawX, clawY);

    // Atualizar geometria do braço
    this.updateArmGeometry();

    console.log(`Nova posição do cotovelo: (${elbowX.toFixed(2)}, ${elbowY.toFixed(2)})`);
    console.log(`Nova posição da garra: (${clawX.toFixed(2)}, ${clawY.toFixed(2)})`);
    console.log(`Nova distância da garra: ${this.b.toFixed(2)}`);
  }

  joints() {
    console.log("Shoulder:", this.A);
    console.log("Elbow:", this.B);
    console.log("Claw:", this.C);
  }

  parts() {
    console.log("Length a:", this.a);
    console.log("Length b:", this.b);
    console.log("Length c:", this.c);
  }

  angles() {
    console.log("Shoulder Angle:", this.shoulderJoint.getAngle());
    console.log("Elbow Angle:", this.elbowJoint.getAngle());
    console.log("Claw Angle:", this.clawJoint.getAngle());
  }
}

const arm1 = new RoboticArm(shoulder, elbow, claw)
// arm1.angles()
arm1.moveClawFront(4)