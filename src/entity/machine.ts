import DeviceSignal from "entity/deviceSignal";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
class Machine {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @OneToMany(() => DeviceSignal, (signal) => signal.machine)
  signals: DeviceSignal[];

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

export default Machine;
