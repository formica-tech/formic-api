import Device from "entity/device";
import Machine from "entity/machine";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export type EventPayload =
  | { amount: number }
  | { value: number }
  | { key: string };

@Entity()
class DeviceSignal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Machine, (machine) => machine.signals)
  machine: Machine;

  @ManyToOne(() => Device, (device) => device.signals)
  device: Device;

  @Column()
  event: string;

  @Column("jsonb")
  payload: EventPayload;

  @Column("timestamptz")
  timestamp: Date;
}

export default DeviceSignal;
