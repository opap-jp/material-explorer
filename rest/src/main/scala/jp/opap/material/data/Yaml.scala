package jp.opap.material.data

import java.io.File
import java.time.{LocalDateTime, ZoneId}
import java.util.Date

import com.google.common.base.Charsets
import com.google.common.io.Files
import org.yaml.snakeyaml.{Yaml => SnakeYaml}

import scala.collection.JavaConverters._

object Yaml {
  def parse(file: File): AnyRef = {
    val yaml = new SnakeYaml()
    val root = yaml.load[Object](Files.newReader(file, Charsets.UTF_8))
    toNode(root)
  }

  protected def toNode(data: Any): AnyRef = data match {
    case map: java.util.Map[_, _] => MapNode(map.asScala.toMap.map(entry => (entry._1.toString, toNode(entry._2))))
    case list: java.util.List[_] => ListNode(list.asScala.toList.map(element => toNode(element)))
    case null => Unit
    case value: Date => LocalDateTime.ofInstant(value.toInstant, ZoneId.systemDefault())
    case any: AnyRef => any
  }

  case class MapNode(node: Map[String, AnyRef]) {
    def apply(key: String): Entry = Entry(key, this.node.get(key))

    override def toString: String = s"${this.getClass.getSimpleName} (${this.node.size})"
  }
  case class ListNode(node: List[AnyRef]) {
    override def toString: String = s"${this.getClass.getSimpleName} (${this.node.size})"
  }

  case class Entry(key: String, value: Option[AnyRef]) {
    def get: AnyRef = this.value match {
      case Some(x) => x
      case None => throw EntryException(s"$key に要素がありません。")
    }

    def option: Option[Entry] = this.value.map(v => this.copy(value = Option(v)))
    // def option: Option[AnyRef] = this.value

    def string: String = this.value match {
      case Some(x: String) => x
      case None => throw EntryException(s"$key に要素がありません。")
      case Some(x) => throw EntryException(s"$key => $x の値を文字列として取得することはできません。")
    }
  }

  case class EntryException(message: String) extends RuntimeException(message)
}
