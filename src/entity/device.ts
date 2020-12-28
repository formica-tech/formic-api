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
class Device {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @OneToMany(() => DeviceSignal, (signal) => signal.device)
  signals: DeviceSignal;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

export default Device;
