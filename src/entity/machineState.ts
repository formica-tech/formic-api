import DeviceSignal from "entity/deviceSignal";
import Machine from "entity/machine";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from "typeorm";

@Entity()
class MachineState {
  @ManyToOne(() => Machine)
  machine: Machine;

  @PrimaryColumn("uuid")
  machineId: string;

  @OneToOne(() => DeviceSignal)
  @JoinColumn()
  openSignal: DeviceSignal;

  @PrimaryColumn("uuid")
  openSignalId: string;

  @OneToOne(() => DeviceSignal)
  @JoinColumn()
  closeSignal: DeviceSignal;

  @PrimaryColumn("uuid")
  closeSignalId: string;

  @Column()
  state: string;

  @Column("bigint")
  duration: bigint;

  @CreateDateColumn()
  createdAt: Date;
}

export default MachineState;
